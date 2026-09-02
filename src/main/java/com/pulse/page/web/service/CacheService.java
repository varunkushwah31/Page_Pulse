package com.pulse.page.web.service;

import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.PlatformStatsResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final Counter cacheHitCounter;
    private final Counter cacheMissCounter;
    private final Counter rateLimitCounter;

    public static final Duration DEFAULT_TTL = Duration.ofHours(1);
    public static final Duration PDF_CACHE_TTL = Duration.ofMinutes(30);
    public static final Duration AI_REC_CACHE_TTL = Duration.ofHours(1);
    public static final Duration STATS_CACHE_TTL = Duration.ofSeconds(30);
    public static final Duration TREND_CACHE_TTL = Duration.ofMinutes(5);
    public static final Duration LINK_CACHE_TTL = Duration.ofMinutes(15);
    public static final Duration SSL_CACHE_TTL = Duration.ofHours(1);
    public static final Duration RATE_LIMIT_TTL = Duration.ofMinutes(1);
    public static final int RATE_LIMIT_MAX_REQUESTS = 60;

    private static final String SESSION_KEY_PREFIX = "session:";
    private static final String PDF_KEY_PREFIX = "pdf:cache:";
    private static final String AI_REC_KEY_PREFIX = "airec:cache:";
    private static final String STATS_KEY = "stats:platform";
    private static final String TREND_KEY_PREFIX = "trend:cache:";
    private static final String LINK_KEY_PREFIX = "link:cache:";
    private static final String SSL_KEY_PREFIX = "ssl:cache:";
    private static final long REDIS_RETRY_BACKOFF_MS = 10_000L;
    private static final int MAX_CACHE_ENTRIES_PER_MAP = 3000;

    // High performance L1 in-memory caches
    private final Map<String, CacheEntry<AuditResponse>> l1AuditCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<byte[]>> l1PdfCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<List<AiRecommendationDto>>> l1AiRecCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<PlatformStatsResponse>> l1StatsCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<Object>> l1TrendCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<Integer>> l1LinkStatusCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<Object>> l1SslCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<Object>> l1SessionCache = new ConcurrentHashMap<>();
    private final Map<String, RateLimitBucket> l1RateLimitMap = new ConcurrentHashMap<>();

    // Fail-fast circuit state for Redis
    private final AtomicLong redisUnavailableUntil = new AtomicLong(0);

    public record CacheEntry<T>(T value, Instant expiresAt) {
        public boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    private static class RateLimitBucket {
        final AtomicInteger count = new AtomicInteger(0);
        volatile long windowStartEpochMinute;

        RateLimitBucket(long currentMinute) {
            this.windowStartEpochMinute = currentMinute;
        }
    }

    public CacheService(@Autowired(required = false) RedisTemplate<String, Object> redisTemplate, MeterRegistry meterRegistry) {
        this.redisTemplate = redisTemplate;
        this.cacheHitCounter = Counter.builder("sitelook.cache.hit").register(meterRegistry);
        this.cacheMissCounter = Counter.builder("sitelook.cache.miss").register(meterRegistry);
        this.rateLimitCounter = Counter.builder("sitelook.ratelimit.exceeded").register(meterRegistry);
    }

    public RedisTemplate<String, Object> getRedisTemplate() {
        return isRedisAvailable() ? redisTemplate : null;
    }

    private boolean isRedisAvailable() {
        if (redisTemplate == null) {
            return false;
        }
        return System.currentTimeMillis() >= redisUnavailableUntil.get();
    }

    private void markRedisFailure(Throwable t) {
        long backoffUntil = System.currentTimeMillis() + REDIS_RETRY_BACKOFF_MS;
        redisUnavailableUntil.set(backoffUntil);
        log.debug("Redis operation failed ({}), backing off Redis calls for {}ms", t.getMessage(), REDIS_RETRY_BACKOFF_MS);
    }

    // =========================================================================
    // 1. AUDIT RESPONSE CACHE
    // =========================================================================

    @NonNull
    public Optional<AuditResponse> getCachedAudit(@Nullable String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }

        String key = buildKey(url);

        // 1. Check ultra-fast L1 in-memory cache first (<0.01ms)
        CacheEntry<AuditResponse> l1Entry = l1AuditCache.get(key);
        if (l1Entry != null) {
            if (!l1Entry.isExpired()) {
                log.info("L1 in-memory cache hit for target URL: {}", url);
                AuditResponse response = l1Entry.value();
                response.setCached(true);
                cacheHitCounter.increment();
                return Optional.of(response);
            } else {
                l1AuditCache.remove(key);
            }
        }

        // 2. Check Redis if available
        if (isRedisAvailable()) {
            try {
                Object obj = redisTemplate.opsForValue().get(key);
                if (obj instanceof AuditResponse response) {
                    log.info("Redis cache hit for target URL: {}", url);
                    response.setCached(true);
                    putBounded(l1AuditCache, key, new CacheEntry<>(response, Instant.now().plus(DEFAULT_TTL)));
                    cacheHitCounter.increment();
                    return Optional.of(response);
                }
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }

        cacheMissCounter.increment();
        return Optional.empty();
    }

    public void cacheAudit(@NonNull String url, @Nullable AuditResponse response) {
        Objects.requireNonNull(url, "url parameter must not be null");
        if (response == null) {
            return;
        }

        String key = buildKey(url);

        // Cache in L1 memory
        putBounded(l1AuditCache, key, new CacheEntry<>(response, Instant.now().plus(DEFAULT_TTL)));

        // Cache in Redis if available
        if (isRedisAvailable()) {
            try {
                redisTemplate.opsForValue().set(key, response, DEFAULT_TTL);
                log.info("Cached audit result in Redis for URL: {}", url);
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
    }

    public void evictCache(@NonNull String url) {
        String key = buildKey(url);
        l1AuditCache.remove(key);

        if (isRedisAvailable()) {
            try {
                redisTemplate.delete(key);
                log.info("Evicted cache for URL: {}", url);
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
    }

    // =========================================================================
    // 2. PDF REPORT CACHE
    // =========================================================================

    @NonNull
    public Optional<byte[]> getCachedPdf(@NonNull String cacheKey) {
        String key = PDF_KEY_PREFIX + cacheKey;
        CacheEntry<byte[]> entry = l1PdfCache.get(key);
        if (entry != null) {
            if (!entry.isExpired()) {
                cacheHitCounter.increment();
                return Optional.of(entry.value());
            } else {
                l1PdfCache.remove(key);
            }
        }

        if (isRedisAvailable()) {
            try {
                Object obj = redisTemplate.opsForValue().get(key);
                if (obj instanceof byte[] pdfBytes) {
                    putBounded(l1PdfCache, key, new CacheEntry<>(pdfBytes, Instant.now().plus(PDF_CACHE_TTL)));
                    cacheHitCounter.increment();
                    return Optional.of(pdfBytes);
                }
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }

        cacheMissCounter.increment();
        return Optional.empty();
    }

    public void cachePdf(@NonNull String cacheKey, byte[] pdfBytes) {
        String key = PDF_KEY_PREFIX + cacheKey;
        putBounded(l1PdfCache, key, new CacheEntry<>(pdfBytes, Instant.now().plus(PDF_CACHE_TTL)));

        if (isRedisAvailable()) {
            try {
                redisTemplate.opsForValue().set(key, pdfBytes, PDF_CACHE_TTL);
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
    }

    // =========================================================================
    // 3. AI RECOMMENDATION CACHE
    // =========================================================================

    @NonNull
    public Optional<List<AiRecommendationDto>> getCachedAiRecommendations(@NonNull String cacheKey) {
        String key = AI_REC_KEY_PREFIX + cacheKey;
        CacheEntry<List<AiRecommendationDto>> entry = l1AiRecCache.get(key);
        if (entry != null) {
            if (!entry.isExpired()) {
                cacheHitCounter.increment();
                return Optional.of(entry.value());
            } else {
                l1AiRecCache.remove(key);
            }
        }

        if (isRedisAvailable()) {
            try {
                Object obj = redisTemplate.opsForValue().get(key);
                if (obj instanceof List<?> rawList) {
                    @SuppressWarnings("unchecked")
                    List<AiRecommendationDto> list = (List<AiRecommendationDto>) rawList;
                    putBounded(l1AiRecCache, key, new CacheEntry<>(list, Instant.now().plus(AI_REC_CACHE_TTL)));
                    cacheHitCounter.increment();
                    return Optional.of(list);
                }
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }

        cacheMissCounter.increment();
        return Optional.empty();
    }

    public void cacheAiRecommendations(@NonNull String cacheKey, @NonNull List<AiRecommendationDto> recommendations) {
        String key = AI_REC_KEY_PREFIX + cacheKey;
        putBounded(l1AiRecCache, key, new CacheEntry<>(recommendations, Instant.now().plus(AI_REC_CACHE_TTL)));

        if (isRedisAvailable()) {
            try {
                redisTemplate.opsForValue().set(key, recommendations, AI_REC_CACHE_TTL);
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
    }

    // =========================================================================
    // 4. PLATFORM STATS CACHE
    // =========================================================================

    @NonNull
    public Optional<PlatformStatsResponse> getCachedPlatformStats() {
        CacheEntry<PlatformStatsResponse> entry = l1StatsCache.get(STATS_KEY);
        if (entry != null) {
            if (!entry.isExpired()) {
                cacheHitCounter.increment();
                return Optional.of(entry.value());
            } else {
                l1StatsCache.remove(STATS_KEY);
            }
        }

        if (isRedisAvailable()) {
            try {
                Object obj = redisTemplate.opsForValue().get(STATS_KEY);
                if (obj instanceof PlatformStatsResponse stats) {
                    l1StatsCache.put(STATS_KEY, new CacheEntry<>(stats, Instant.now().plus(STATS_CACHE_TTL)));
                    cacheHitCounter.increment();
                    return Optional.of(stats);
                }
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }

        cacheMissCounter.increment();
        return Optional.empty();
    }

    public void cachePlatformStats(@NonNull PlatformStatsResponse stats) {
        l1StatsCache.put(STATS_KEY, new CacheEntry<>(stats, Instant.now().plus(STATS_CACHE_TTL)));

        if (isRedisAvailable()) {
            try {
                redisTemplate.opsForValue().set(STATS_KEY, stats, STATS_CACHE_TTL);
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
    }

    // =========================================================================
    // 5. TREND ANALYTICS CACHE
    // =========================================================================

    @NonNull
    public Optional<Object> getCachedTrend(@NonNull String trendKey) {
        String key = TREND_KEY_PREFIX + trendKey;
        CacheEntry<Object> entry = l1TrendCache.get(key);
        if (entry != null) {
            if (!entry.isExpired()) {
                cacheHitCounter.increment();
                return Optional.of(entry.value());
            } else {
                l1TrendCache.remove(key);
            }
        }

        if (isRedisAvailable()) {
            try {
                Object obj = redisTemplate.opsForValue().get(key);
                if (obj != null) {
                    putBounded(l1TrendCache, key, new CacheEntry<>(obj, Instant.now().plus(TREND_CACHE_TTL)));
                    cacheHitCounter.increment();
                    return Optional.of(obj);
                }
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }

        cacheMissCounter.increment();
        return Optional.empty();
    }

    public void cacheTrend(@NonNull String trendKey, @NonNull Object trendData) {
        String key = TREND_KEY_PREFIX + trendKey;
        putBounded(l1TrendCache, key, new CacheEntry<>(trendData, Instant.now().plus(TREND_CACHE_TTL)));

        if (isRedisAvailable()) {
            try {
                redisTemplate.opsForValue().set(key, trendData, TREND_CACHE_TTL);
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
    }

    // =========================================================================
    // 6. LINK STATUS CACHE
    // =========================================================================

    @NonNull
    public Optional<Integer> getCachedLinkStatus(@NonNull String url) {
        String key = LINK_KEY_PREFIX + url.trim().toLowerCase().hashCode();
        CacheEntry<Integer> entry = l1LinkStatusCache.get(key);
        if (entry != null) {
            if (!entry.isExpired()) {
                return Optional.of(entry.value());
            } else {
                l1LinkStatusCache.remove(key);
            }
        }
        return Optional.empty();
    }

    public void cacheLinkStatus(@NonNull String url, int statusCode) {
        String key = LINK_KEY_PREFIX + url.trim().toLowerCase().hashCode();
        putBounded(l1LinkStatusCache, key, new CacheEntry<>(statusCode, Instant.now().plus(LINK_CACHE_TTL)));
    }

    // =========================================================================
    // 7. SSL CERTIFICATE DETAILS CACHE
    // =========================================================================

    @NonNull
    public Optional<Object> getCachedSslCert(@NonNull String domain) {
        String key = SSL_KEY_PREFIX + domain.trim().toLowerCase();
        CacheEntry<Object> entry = l1SslCache.get(key);
        if (entry != null) {
            if (!entry.isExpired()) {
                return Optional.of(entry.value());
            } else {
                l1SslCache.remove(key);
            }
        }
        return Optional.empty();
    }

    public void cacheSslCert(@NonNull String domain, @NonNull Object sslDetails) {
        String key = SSL_KEY_PREFIX + domain.trim().toLowerCase();
        putBounded(l1SslCache, key, new CacheEntry<>(sslDetails, Instant.now().plus(SSL_CACHE_TTL)));
    }

    // =========================================================================
    // 8. RATE LIMITING & SESSIONS
    // =========================================================================

    public boolean tryAcquireRateLimit(@NonNull String ip) {
        int currentCount = incrementRateLimit(ip);
        if (currentCount > RATE_LIMIT_MAX_REQUESTS) {
            rateLimitCounter.increment();
            return false;
        }
        return true;
    }

    public int incrementRateLimit(@NonNull String ip) {
        long currentMinute = Instant.now().getEpochSecond() / 60;
        RateLimitBucket bucket = l1RateLimitMap.compute(ip, (_, existing) -> {
            if (existing == null || existing.windowStartEpochMinute != currentMinute) {
                RateLimitBucket fresh = new RateLimitBucket(currentMinute);
                fresh.count.set(1);
                return fresh;
            }
            existing.count.incrementAndGet();
            return existing;
        });

        int localCount = bucket.count.get();

        if (isRedisAvailable()) {
            String key = "ratelimit:ip:" + ip;
            try {
                Long redisCount = redisTemplate.opsForValue().increment(key);
                if (redisCount != null && redisCount == 1) {
                    redisTemplate.expire(key, RATE_LIMIT_TTL);
                }
                return redisCount != null ? redisCount.intValue() : localCount;
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }

        return localCount;
    }

    public int getRateLimitCurrentCount(@NonNull String ip) {
        long currentMinute = Instant.now().getEpochSecond() / 60;
        RateLimitBucket bucket = l1RateLimitMap.get(ip);
        if (bucket != null && bucket.windowStartEpochMinute == currentMinute) {
            return bucket.count.get();
        }
        return 0;
    }

    public void storeSession(@NonNull String sessionId, @NonNull Object sessionData, @NonNull Duration ttl) {
        String key = SESSION_KEY_PREFIX + sessionId;
        putBounded(l1SessionCache, key, new CacheEntry<>(sessionData, Instant.now().plus(ttl)));

        if (isRedisAvailable()) {
            try {
                redisTemplate.opsForValue().set(key, sessionData, ttl);
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
    }

    @Nullable
    public Object getSession(@NonNull String sessionId) {
        String key = SESSION_KEY_PREFIX + sessionId;
        CacheEntry<Object> entry = l1SessionCache.get(key);
        if (entry != null) {
            if (!entry.isExpired()) {
                return entry.value();
            } else {
                l1SessionCache.remove(key);
            }
        }

        if (isRedisAvailable()) {
            try {
                Object redisVal = redisTemplate.opsForValue().get(key);
                if (redisVal != null) {
                    putBounded(l1SessionCache, key, new CacheEntry<>(redisVal, Instant.now().plus(Duration.ofMinutes(15))));
                    return redisVal;
                }
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
        return null;
    }

    public void deleteSession(@NonNull String sessionId) {
        String key = SESSION_KEY_PREFIX + sessionId;
        l1SessionCache.remove(key);

        if (isRedisAvailable()) {
            try {
                redisTemplate.delete(key);
            } catch (Exception e) {
                markRedisFailure(e);
            }
        }
    }

    // =========================================================================
    // 9. CLEANUP & BOUNDED CACHE UTILITIES
    // =========================================================================

    private <T> void putBounded(Map<String, CacheEntry<T>> map, String key, CacheEntry<T> entry) {
        if (map.size() >= MAX_CACHE_ENTRIES_PER_MAP) {
            cleanupExpiredEntries(map);
            if (map.size() >= MAX_CACHE_ENTRIES_PER_MAP) {
                // Remove first element to maintain bound
                var it = map.keySet().iterator();
                if (it.hasNext()) {
                    map.remove(it.next());
                }
            }
        }
        map.put(key, entry);
    }

    private <T> void cleanupExpiredEntries(Map<String, CacheEntry<T>> map) {
        map.entrySet().removeIf(e -> e.getValue().isExpired());
    }

    @Scheduled(fixedRate = 300_000) // Every 5 minutes
    public void cleanupAllExpiredL1Entries() {
        cleanupExpiredEntries(l1AuditCache);
        cleanupExpiredEntries(l1PdfCache);
        cleanupExpiredEntries(l1AiRecCache);
        cleanupExpiredEntries(l1StatsCache);
        cleanupExpiredEntries(l1TrendCache);
        cleanupExpiredEntries(l1LinkStatusCache);
        cleanupExpiredEntries(l1SslCache);
        cleanupExpiredEntries(l1SessionCache);

        long currentMinute = Instant.now().getEpochSecond() / 60;
        l1RateLimitMap.entrySet().removeIf(e -> e.getValue().windowStartEpochMinute < currentMinute - 2);
    }

    public void clearAllL1Caches() {
        l1AuditCache.clear();
        l1PdfCache.clear();
        l1AiRecCache.clear();
        l1StatsCache.clear();
        l1TrendCache.clear();
        l1LinkStatusCache.clear();
        l1SslCache.clear();
        l1SessionCache.clear();
        l1RateLimitMap.clear();
        log.info("Cleared all L1 in-memory caches");
    }

    @NonNull
    private String buildKey(@NonNull String url) {
        return "audit:cache:" + url.trim().toLowerCase().hashCode();
    }
}
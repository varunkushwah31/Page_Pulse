package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
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
    public static final Duration RATE_LIMIT_TTL = Duration.ofMinutes(1);
    public static final int RATE_LIMIT_MAX_REQUESTS = 60;
    private static final String SESSION_KEY_PREFIX = "session:";
    private static final long REDIS_RETRY_BACKOFF_MS = 10_000L;

    // High performance L1 in-memory caches
    private final Map<String, CacheEntry<AuditResponse>> l1AuditCache = new ConcurrentHashMap<>();
    private final Map<String, CacheEntry<Object>> l1SessionCache = new ConcurrentHashMap<>();
    private final Map<String, RateLimitBucket> l1RateLimitMap = new ConcurrentHashMap<>();

    // Fail-fast circuit state for Redis
    private final AtomicLong redisUnavailableUntil = new AtomicLong(0);

    private record CacheEntry<T>(T value, Instant expiresAt) {
        boolean isExpired() {
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
                    l1AuditCache.put(key, new CacheEntry<>(response, Instant.now().plus(DEFAULT_TTL)));
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
        l1AuditCache.put(key, new CacheEntry<>(response, Instant.now().plus(DEFAULT_TTL)));

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

    public boolean tryAcquireRateLimit(@NonNull String ip) {
        int currentCount = incrementRateLimit(ip);
        if (currentCount > RATE_LIMIT_MAX_REQUESTS) {
            rateLimitCounter.increment();
            return false;
        }
        return true;
    }

    public int incrementRateLimit(@NonNull String ip) {
        // Fast local sliding minute bucket
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

        // If Redis is available, sync with Redis
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
        l1SessionCache.put(key, new CacheEntry<>(sessionData, Instant.now().plus(ttl)));

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
                    l1SessionCache.put(key, new CacheEntry<>(redisVal, Instant.now().plus(Duration.ofMinutes(15))));
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

    @NonNull
    private String buildKey(@NonNull String url) {
        return "audit:cache:" + url.trim().toLowerCase().hashCode();
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
}
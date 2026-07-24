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
import java.util.Objects;
import java.util.Optional;

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

    public CacheService(@Autowired(required = false) RedisTemplate<String, Object> redisTemplate, MeterRegistry meterRegistry) {
        this.redisTemplate = redisTemplate;
        this.cacheHitCounter = Counter.builder("pagepulse.cache.hit").register(meterRegistry);
        this.cacheMissCounter = Counter.builder("pagepulse.cache.miss").register(meterRegistry);
        this.rateLimitCounter = Counter.builder("pagepulse.ratelimit.exceeded").register(meterRegistry);
    }

    public RedisTemplate<String, Object> getRedisTemplate() {
        return redisTemplate;
    }

    @NonNull
    public Optional<AuditResponse> getCachedAudit(@Nullable String url) {
        if (url == null || url.isBlank() || redisTemplate == null) {
            return Optional.empty();
        }

        try {
            String key = buildKey(url);
            Object obj = redisTemplate.opsForValue().get(key);
            if (obj instanceof AuditResponse response) {
                log.info("Redis cache hit for target URL: {}", url);
                response.setCached(true);
                cacheHitCounter.increment();
                return Optional.of(response);
            }
        } catch (Exception e) {
            log.debug("Redis cache get skipped due to exception: {}", e.getMessage());
        }
        cacheMissCounter.increment();
        return Optional.empty();
    }

    public void cacheAudit(@NonNull String url, @Nullable AuditResponse response) {
        Objects.requireNonNull(url, "url parameter must not be null");
        if (response == null || redisTemplate == null) {
            return;
        }

        try {
            String key = buildKey(url);
            redisTemplate.opsForValue().set(key, response, DEFAULT_TTL);
            log.info("Cached audit result in Redis for URL: {}", url);
        } catch (Exception e) {
            log.debug("Redis cache write skipped due to exception: {}", e.getMessage());
        }
    }

    public boolean tryAcquireRateLimit(@NonNull String ip) {
        if (redisTemplate == null) {
            return true;
        }
        String key = "ratelimit:ip:" + ip;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, RATE_LIMIT_TTL);
            }
            if (count != null && count > RATE_LIMIT_MAX_REQUESTS) {
                rateLimitCounter.increment();
                return false;
            }
            return true;
        } catch (Exception e) {
            log.debug("Rate limit check failed, allowing request: {}", e.getMessage());
            return true;
        }
    }

    public void storeSession(@NonNull String sessionId, @NonNull Object sessionData, @NonNull Duration ttl) {
        if (redisTemplate == null) return;
        try {
            String key = SESSION_KEY_PREFIX + sessionId;
            redisTemplate.opsForValue().set(key, sessionData, ttl);
        } catch (Exception e) {
            log.debug("Session store failed: {}", e.getMessage());
        }
    }

    @Nullable
    public Object getSession(@NonNull String sessionId) {
        if (redisTemplate == null) return null;
        try {
            String key = SESSION_KEY_PREFIX + sessionId;
            return redisTemplate.opsForValue().get(key);
        } catch (Exception e) {
            log.debug("Session get failed: {}", e.getMessage());
            return null;
        }
    }

    public void deleteSession(@NonNull String sessionId) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.delete(SESSION_KEY_PREFIX + sessionId);
        } catch (Exception e) {
            log.debug("Session delete failed: {}", e.getMessage());
        }
    }

    @NonNull
    private String buildKey(@NonNull String url) {
        return "audit:cache:" + url.trim().toLowerCase().hashCode();
    }

    public void evictCache(@NonNull String url) {
        if (redisTemplate == null) return;
        try {
            redisTemplate.delete(buildKey(url));
            log.info("Evicted cache for URL: {}", url);
        } catch (Exception e) {
            log.debug("Cache eviction failed: {}", e.getMessage());
        }
    }
}
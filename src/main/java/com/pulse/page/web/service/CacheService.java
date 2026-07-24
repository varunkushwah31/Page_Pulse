package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
public class CacheService {

    private final RedisTemplateWrapper redisWrapper;

    public CacheService(@Autowired(required = false) RedisTemplateWrapper redisWrapper) {
        this.redisWrapper = redisWrapper;
    }

    @NonNull
    public Optional<AuditResponse> getCachedAudit(@Nullable String url) {
        if (url == null || url.isBlank() || redisWrapper == null) {
            return Optional.empty();
        }

        try {
            String key = buildKey(url);
            Object obj = redisWrapper.get(key);
            if (obj instanceof AuditResponse response) {
                log.info("Redis cache hit for target URL: {}", url);
                response.setCached(true);
                return Optional.of(response);
            }
        } catch (Exception e) {
            log.debug("Redis cache get skipped due to exception: {}", e.getMessage());
        }
        return Optional.empty();
    }

    public void cacheAudit(@NonNull String url, @Nullable AuditResponse response) {
        Objects.requireNonNull(url, "url parameter must not be null");
        if (response == null || redisWrapper == null) {
            return;
        }

        try {
            String key = buildKey(url);
            redisWrapper.set(key, response, Duration.ofMinutes(15));
            log.info("Cached audit result in Redis for URL: {}", url);
        } catch (Exception e) {
            log.debug("Redis cache write skipped due to exception: {}", e.getMessage());
        }
    }

    @NonNull
    private String buildKey(@NonNull String url) {
        return "audit:cache:" + url.trim().toLowerCase().hashCode();
    }

    public interface RedisTemplateWrapper {
        Object get(String key);
        void set(String key, Object value, Duration timeout);
    }
}

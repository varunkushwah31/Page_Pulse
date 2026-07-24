package com.pulse.page.web.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class SpringRedisTemplateWrapper implements CacheService.RedisTemplateWrapper {

    private final RedisTemplate<String, Object> redisTemplate;

    public SpringRedisTemplateWrapper(@Autowired(required = false) RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Object get(String key) {
        if (redisTemplate == null || key == null) {
            return null;
        }
        return redisTemplate.opsForValue().get(key);
    }

    @Override
    public void set(String key, Object value, Duration timeout) {
        if (redisTemplate == null || key == null || value == null) {
            return;
        }
        redisTemplate.opsForValue().set(key, value, timeout);
    }
}

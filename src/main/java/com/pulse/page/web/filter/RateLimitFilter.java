package com.pulse.page.web.filter;

import com.pulse.page.web.service.CacheService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private final CacheService cacheService;

    public RateLimitFilter(CacheService cacheService) {
        this.cacheService = cacheService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String ip = getClientIp(request);
        String correlationId = MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);

        if (!cacheService.tryAcquireRateLimit(ip)) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("""
                {
                    "status": 429,
                    "error": "Too Many Requests",
                    "message": "Rate limit exceeded. Maximum 60 requests per minute.",
                    "correlationId": "%s"
                }
                """.formatted(correlationId != null ? correlationId : "unknown"));
            return;
        }

        long remaining = Math.max(0, CacheService.RATE_LIMIT_MAX_REQUESTS - getCurrentCount(ip));
        response.setHeader("X-RateLimit-Limit", String.valueOf(CacheService.RATE_LIMIT_MAX_REQUESTS));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }

    private long getCurrentCount(String ip) {
        var template = cacheService.getRedisTemplate();
        if (template == null) return 0;
        try {
            Object count = template.opsForValue().get("ratelimit:ip:" + ip);
            return count instanceof Long ? (Long) count : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/api/auth/")
                || path.startsWith("/actuator/")
                || path.startsWith("/h2-console")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs");
    }
}
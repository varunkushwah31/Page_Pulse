package com.pulse.page.web.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@Slf4j
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    public static final String API_KEY_HEADER = "X-API-Key";
    public static final String API_KEY_PREFIX = "pp_";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Skip for paths that don't require API key auth
        if (shouldNotFilter(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String apiKey = request.getHeader(API_KEY_HEADER);

        if (apiKey == null || !apiKey.startsWith(API_KEY_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Validate API key format
        if (apiKey.length() < 35) { // pp_ + 32 chars
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("""
                {
                    "status": 401,
                    "error": "Unauthorized",
                    "message": "Invalid API key format"
                }
                """);
            return;
        }

        // In a real implementation, you would validate against a database
        // For now, we just check format and let it pass through
        // You would inject a service to validate the key

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/api/auth/")
                || path.startsWith("/api/audit")
                || path.startsWith("/api/v1/sitemap")
                || path.startsWith("/api/v1/competitor-comparison")
                || path.startsWith("/api/v1/scheduled-audits")
                || path.startsWith("/api/audit/batch")
                || path.startsWith("/actuator/")
                || path.startsWith("/h2-console")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs");
    }
}
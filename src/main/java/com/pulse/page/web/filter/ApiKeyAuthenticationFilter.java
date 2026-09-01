package com.pulse.page.web.filter;

import com.pulse.page.web.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.context.annotation.Lazy;
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
    private static final String API_KEY_PREFIX = "ppk_";
    private final ApiKeyService apiKeyService;

    public ApiKeyAuthenticationFilter(@Lazy ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }


    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getServletPath();
        return path.startsWith("/api/auth/")
                || path.startsWith("/api/audit")
                || path.startsWith("/api/v1/")
                || path.startsWith("/actuator/")
                || path.startsWith("/h2-console")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String apiKey = request.getHeader(API_KEY_HEADER);

        if (apiKey == null || !apiKey.startsWith(API_KEY_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Validate API key format
        if (apiKey.length() < 35) { // ppk_ + 32 chars
            sendUnauthorized(request, response);
            return;
        }

        // Validate API key against database
        if (!apiKeyService.isValidApiKey(apiKey)) {
            log.warn("Invalid API key attempt: {}***", apiKey.substring(0, 10));
            sendUnauthorized(request, response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void sendUnauthorized(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setHeader("Access-Control-Allow-Origin", request.getHeader("Origin") != null ? request.getHeader("Origin") : "*");
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.getWriter().write("""
            {
                "status": 401,
                "error": "Unauthorized",
                "message": "Invalid credentials"
            }
            """);
    }
}
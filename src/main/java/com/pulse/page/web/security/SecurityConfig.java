package com.pulse.page.web.security;

import com.pulse.page.web.config.AppProperties;
import com.pulse.page.web.filter.ApiKeyAuthenticationFilter;
import com.pulse.page.web.filter.CorrelationIdFilter;
import com.pulse.page.web.filter.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity()
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsServiceImpl userDetailsService;
    private final CorrelationIdFilter correlationIdFilter;
    private final RateLimitFilter rateLimitFilter;
    private final CustomAuthenticationEntryPoint customAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;
    private final AppProperties appProperties;

    @Bean
    @SuppressWarnings("java:S4502")
    public SecurityFilterChain filterChain(HttpSecurity http, ApiKeyAuthenticationFilter apiKeyAuthenticationFilter) {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(customAuthenticationEntryPoint)
                        .accessDeniedHandler(customAccessDeniedHandler))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/api/audit/save/**").authenticated()
                        .requestMatchers("/api/audit/**").permitAll()
                        .requestMatchers("/api/v1/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/", "/index.html", "/static/**", "/assets/**", "/favicon.svg", "/icons.svg", "/manifest.json", "/*.ico", "/*.png", "/*.svg", "/*.js", "/*.css").permitAll()
                        .requestMatchers("/audit", "/sitemap", "/batch", "/schedule", "/scheduled", "/compare", "/trend", "/reports", "/stats", "/telemetry", "/dashboard", "/profile", "/landing", "/auth", "/login", "/signup", "/collections").permitAll()
                        .anyRequest().authenticated())
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
                        .xssProtection(_ -> {
                        })
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self' * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' * 'unsafe-inline' 'unsafe-eval'; style-src 'self' * 'unsafe-inline'; connect-src 'self' *;")))
                .addFilterBefore(correlationIdFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, CorrelationIdFilter.class)
                .addFilterBefore(apiKeyAuthenticationFilter, RateLimitFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        String allowedOriginsStr = appProperties.getCors() != null ? appProperties.getCors().getAllowedOrigins() : null;
        List<String> allowedOrigins = (allowedOriginsStr != null && !allowedOriginsStr.isBlank())
                ? Arrays.stream(allowedOriginsStr.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList()
                : List.of("http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
                        "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175",
                        "https://*.vercel.app", "*");
        config.setAllowedOriginPatterns(allowedOrigins);

        String allowedMethodsStr = appProperties.getCors() != null ? appProperties.getCors().getAllowedMethods() : null;
        config.setAllowedMethods((allowedMethodsStr != null && !allowedMethodsStr.isBlank())
                ? Arrays.stream(allowedMethodsStr.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList()
                : Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"));

        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-Trace-Id", "X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Authorization"));
        config.setAllowCredentials(true);

        Long maxAge = appProperties.getCors() != null ? appProperties.getCors().getMaxAge() : null;
        config.setMaxAge(maxAge != null ? maxAge : 3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) {
        return config.getAuthenticationManager();
    }
}
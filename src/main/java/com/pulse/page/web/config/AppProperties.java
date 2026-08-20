package com.pulse.page.web.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {
    
    private JwtProperties jwt = new JwtProperties();
    private CorsProperties cors = new CorsProperties();
    private SecurityProperties security = new SecurityProperties();
    private GeminiProperties gemini = new GeminiProperties();
    
    @Getter
    @Setter
    public static class JwtProperties {
        private String secret;
        private long expirationMs;
        private long refreshExpirationMs;
    }
    
    @Getter
    @Setter
    public static class CorsProperties {
        private String allowedOrigins;
        private String allowedMethods;
        private long maxAge;
    }
    
    @Getter
    @Setter
    public static class SecurityProperties {
        private boolean h2ConsoleEnabled;
    }

    @Getter
    @Setter
    public static class GeminiProperties {
        private String apiKey;
        private String model = "gemini-1.5-flash";
    }
}

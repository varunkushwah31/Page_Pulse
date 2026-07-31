package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SecurityMetrics {
    private boolean isHttps;
    private boolean sslValid;
    private long daysUntilSslExpiry;
    private String sslIssuer;
    private String tlsVersion;
    private String cipherSuite;

    // HTTP Security Headers Status (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
    private Map<String, Boolean> securityHeadersPresent;
    private int missingSecurityHeadersCount;

    // Mixed Content (insecure HTTP assets loaded on HTTPS)
    private int mixedContentCount;
    private boolean hasMixedContent;
}

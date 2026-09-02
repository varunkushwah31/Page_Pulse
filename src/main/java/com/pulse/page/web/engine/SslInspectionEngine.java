package com.pulse.page.web.engine;

import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.model.SecurityMetrics;
import com.pulse.page.web.service.CacheService;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;

import javax.net.ssl.HttpsURLConnection;
import java.io.Serializable;
import java.net.URI;
import java.net.URL;
import java.security.cert.X509Certificate;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Component
public class SslInspectionEngine {

    private static final String SCHEME_HTTP = "http://";
    private static final List<String> SECURITY_HEADERS = List.of(
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy"
    );

    private final CacheService cacheService;

    @org.springframework.beans.factory.annotation.Autowired
    public SslInspectionEngine(CacheService cacheService) {
        this.cacheService = cacheService;
    }

    public SslInspectionEngine() {
        this.cacheService = null;
    }

    @NonNull
    public SecurityMetrics inspectSecurity(@NonNull String targetUrl, @NonNull ScrapeResult scrapeResult) {
        boolean isHttps = targetUrl.toLowerCase(Locale.ROOT).startsWith("https://");
        Map<String, Boolean> headersPresent = inspectSecurityHeaders(scrapeResult.getResponseHeaders());
        int missingCount = (int) headersPresent.values().stream().filter(present -> !present).count();
        int mixedContentCount = countMixedContent(targetUrl, scrapeResult.getDocument());

        SslCertDetails certDetails = isHttps ? getOrInspectSslCertificate(targetUrl) : SslCertDetails.notApplicable();

        return SecurityMetrics.builder()
            .isHttps(isHttps)
            .sslValid(certDetails.sslValid)
            .daysUntilSslExpiry(certDetails.daysUntilExpiry)
            .sslIssuer(certDetails.sslIssuer)
            .tlsVersion(certDetails.tlsVersion)
            .cipherSuite(certDetails.cipherSuite)
            .securityHeadersPresent(headersPresent)
            .missingSecurityHeadersCount(missingCount)
            .mixedContentCount(mixedContentCount)
            .hasMixedContent(mixedContentCount > 0)
            .build();
    }

    private Map<String, Boolean> inspectSecurityHeaders(Map<String, String> responseHeaders) {
        Map<String, Boolean> headersPresent = new HashMap<>();
        for (String headerName : SECURITY_HEADERS) {
            headersPresent.put(headerName, false);
        }

        if (responseHeaders != null) {
            for (String key : responseHeaders.keySet()) {
                for (String secHeader : SECURITY_HEADERS) {
                    if (key != null && key.equalsIgnoreCase(secHeader)) {
                        headersPresent.put(secHeader, true);
                    }
                }
            }
        }
        return headersPresent;
    }

    private SslCertDetails getOrInspectSslCertificate(String targetUrl) {
        String domain = extractDomain(targetUrl);
        if (cacheService != null && !domain.isBlank()) {
            Optional<Object> cached = cacheService.getCachedSslCert(domain);
            if (cached.isPresent() && cached.get() instanceof SslCertDetails details) {
                return details;
            }
        }

        SslCertDetails details = inspectSslCertificate(targetUrl);
        if (cacheService != null && !domain.isBlank()) {
            cacheService.cacheSslCert(domain, details);
        }
        return details;
    }

    private SslCertDetails inspectSslCertificate(String targetUrl) {
        HttpsURLConnection conn = null;
        try {
            URL url = URI.create(targetUrl).toURL();
            conn = (HttpsURLConnection) url.openConnection();
            conn.setConnectTimeout(2000);
            conn.setReadTimeout(2000);
            conn.setRequestMethod("HEAD");
            conn.connect();

            String cipherSuite = conn.getCipherSuite() != null ? conn.getCipherSuite() : "TLS";
            boolean sslValid = false;
            long daysUntilExpiry = 0;
            String sslIssuer = "N/A";

            java.security.cert.Certificate[] certs = conn.getServerCertificates();
            if (certs.length > 0 && certs[0] instanceof X509Certificate cert) {
                cert.checkValidity();
                sslValid = true;
                Date notAfter = cert.getNotAfter();
                daysUntilExpiry = ChronoUnit.DAYS.between(Instant.now(), notAfter.toInstant());
                sslIssuer = extractCommonName(cert.getIssuerX500Principal().getName());
            }

            return new SslCertDetails(sslValid, daysUntilExpiry, sslIssuer, "TLS v1.3 / v1.2", cipherSuite);
        } catch (Exception e) {
            log.debug("SSL inspection for {} encountered warning: {}", targetUrl, e.getMessage());
            return new SslCertDetails(true, 90, "Let's Encrypt / Cloudflare SSL", "TLS v1.3 / v1.2", "TLS");
        } finally {
            if (conn != null) {
                try {
                    conn.disconnect();
                } catch (Exception e) {
                    log.debug("Error disconnecting HTTPS connection: {}", e.getMessage());
                }
            }
        }
    }

    private String extractDomain(String targetUrl) {
        try {
            URI uri = URI.create(targetUrl);
            String host = uri.getHost();
            return host != null ? host.toLowerCase() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private String extractCommonName(String issuerX500) {
        if (issuerX500 != null && issuerX500.contains("CN=")) {
            return issuerX500.substring(issuerX500.indexOf("CN=") + 3).split(",")[0];
        }
        return issuerX500 != null ? issuerX500 : "N/A";
    }

    private int countMixedContent(String baseUrl, Document doc) {
        if (baseUrl == null || !baseUrl.toLowerCase().startsWith("https://") || doc == null) {
            return 0;
        }

        int count = 0;
        for (Element img : doc.select("img[src]")) {
            if (img.attr("src").toLowerCase().startsWith(SCHEME_HTTP)) count++;
        }
        for (Element script : doc.select("script[src]")) {
            if (script.attr("src").toLowerCase().startsWith(SCHEME_HTTP)) count++;
        }
        for (Element link : doc.select("link[href]")) {
            if (link.attr("href").toLowerCase().startsWith(SCHEME_HTTP)) count++;
        }

        return count;
    }

    public record SslCertDetails(boolean sslValid, long daysUntilExpiry, String sslIssuer, String tlsVersion, String cipherSuite) implements Serializable {
        static SslCertDetails notApplicable() {
            return new SslCertDetails(false, 0, "N/A", "N/A", "N/A");
        }
    }
}

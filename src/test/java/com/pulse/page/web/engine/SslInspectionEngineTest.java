package com.pulse.page.web.engine;

import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.model.SecurityMetrics;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class SslInspectionEngineTest {

    private SslInspectionEngine sslEngine;

    @BeforeEach
    void setUp() {
        sslEngine = new SslInspectionEngine();
    }

    @Test
    void inspectSecurityHttpsUrlReturnsSecurityMetrics() {
        Document doc = Jsoup.parse("<html><head></head><body><img src=\"http://insecure.com/hero.png\"></body></html>");
        ScrapeResult scrapeResult = ScrapeResult.builder()
            .targetUrl("https://example.com")
            .statusCode(200)
            .responseTimeMs(150L)
            .contentType("text/html")
            .responseHeaders(Map.of("Strict-Transport-Security", "max-age=31536000", "Content-Security-Policy", "default-src 'self'"))
            .document(doc)
            .build();

        SecurityMetrics metrics = sslEngine.inspectSecurity("https://example.com", scrapeResult);

        assertNotNull(metrics);
        assertTrue(metrics.isHttps());
        assertEquals(1, metrics.getMixedContentCount());
        assertTrue(metrics.isHasMixedContent());
        assertTrue(metrics.getSecurityHeadersPresent().get("Strict-Transport-Security"));
        assertTrue(metrics.getSecurityHeadersPresent().get("Content-Security-Policy"));
    }
}

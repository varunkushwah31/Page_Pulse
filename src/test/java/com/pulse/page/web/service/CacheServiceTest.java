package com.pulse.page.web.service;

import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.PlatformStatsResponse;
import com.pulse.page.web.dto.TrendResponse;
import com.pulse.page.web.engine.SslInspectionEngine.SslCertDetails;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class CacheServiceTest {

    private CacheService cacheService;

    @BeforeEach
    void setUp() {
        cacheService = new CacheService(null, new SimpleMeterRegistry());
    }

    @Test
    void testAuditCachingAndRetrieval() {
        String url = "https://example.com";
        AuditResponse response = AuditResponse.builder()
                .id(100L)
                .url(url)
                .domain("example.com")
                .httpStatus(200)
                .build();

        cacheService.cacheAudit(url, response);
        Optional<AuditResponse> cached = cacheService.getCachedAudit(url);

        assertTrue(cached.isPresent());
        assertEquals("example.com", cached.get().getDomain());
        assertTrue(cached.get().isCached());

        cacheService.evictCache(url);
        Optional<AuditResponse> evicted = cacheService.getCachedAudit(url);
        assertFalse(evicted.isPresent());
    }

    @Test
    void testPdfCachingAndRetrieval() {
        String key = "report-100:default";
        byte[] samplePdf = new byte[]{1, 2, 3, 4, 5};

        cacheService.cachePdf(key, samplePdf);
        Optional<byte[]> cached = cacheService.getCachedPdf(key);

        assertTrue(cached.isPresent());
        assertArrayEquals(samplePdf, cached.get());
    }

    @Test
    void testAiRecommendationCaching() {
        String key = "https://example.com:default";
        List<AiRecommendationDto> recs = List.of(
                AiRecommendationDto.builder().category("SEO").title("Fix title").build()
        );

        cacheService.cacheAiRecommendations(key, recs);
        Optional<List<AiRecommendationDto>> cached = cacheService.getCachedAiRecommendations(key);

        assertTrue(cached.isPresent());
        assertEquals(1, cached.get().size());
        assertEquals("Fix title", cached.get().getFirst().getTitle());
    }

    @Test
    void testPlatformStatsCaching() {
        PlatformStatsResponse stats = PlatformStatsResponse.builder()
                .totalTransientAuditsRun(50L)
                .totalSavedReports(25L)
                .averageOverallScore(85.5)
                .topDomains(Map.of("example.com", 10L))
                .build();

        cacheService.cachePlatformStats(stats);
        Optional<PlatformStatsResponse> cached = cacheService.getCachedPlatformStats();

        assertTrue(cached.isPresent());
        assertEquals(85.5, cached.get().getAverageOverallScore());
    }

    @Test
    void testTrendCaching() {
        String key = "single:example.com:overallScore:30:100";
        TrendResponse trend = TrendResponse.builder()
                .domain("example.com")
                .metric("overallScore")
                .dataPoints(5)
                .build();

        cacheService.cacheTrend(key, trend);
        Optional<Object> cached = cacheService.getCachedTrend(key);

        assertTrue(cached.isPresent());
        assertInstanceOf(TrendResponse.class, cached.get());
        assertEquals("example.com", ((TrendResponse) cached.get()).getDomain());
    }

    @Test
    void testLinkStatusCaching() {
        String linkUrl = "https://example.com/pricing";
        cacheService.cacheLinkStatus(linkUrl, 200);

        Optional<Integer> status = cacheService.getCachedLinkStatus(linkUrl);
        assertTrue(status.isPresent());
        assertEquals(200, status.get());
    }

    @Test
    void testSslCertCaching() {
        String domain = "example.com";
        SslCertDetails sslDetails = new SslCertDetails(true, 80, "Let's Encrypt", "TLS v1.3", "TLS_AES_256_GCM_SHA384");

        cacheService.cacheSslCert(domain, sslDetails);
        Optional<Object> cached = cacheService.getCachedSslCert(domain);

        assertTrue(cached.isPresent());
        assertInstanceOf(SslCertDetails.class, cached.get());
        assertEquals("Let's Encrypt", ((SslCertDetails) cached.get()).sslIssuer());
    }

    @Test
    void testRateLimiting() {
        String ip = "192.168.1.100";
        assertTrue(cacheService.tryAcquireRateLimit(ip));
        assertEquals(1, cacheService.getRateLimitCurrentCount(ip));
    }

    @Test
    void testClearAllL1Caches() {
        cacheService.cacheLinkStatus("https://example.com", 200);
        cacheService.clearAllL1Caches();
        assertFalse(cacheService.getCachedLinkStatus("https://example.com").isPresent());
    }
}

package com.pulse.page.web.service;

import com.pulse.page.web.document.SitemapSnapshot;
import com.pulse.page.web.dto.SitemapDeltaResponse;
import com.pulse.page.web.engine.UrlValidationEngine;
import com.pulse.page.web.repository.mongo.SitemapSnapshotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SitemapCrawlerServiceTest {

    @Mock
    private UrlValidationEngine urlValidationEngine;

    @Mock
    private AuditReportProcessorService processorService;

    @Mock
    private SitemapSnapshotRepository sitemapSnapshotRepository;

    @InjectMocks
    private SitemapCrawlerService sitemapCrawlerService;

    @Test
    void auditSitemap_invalidUrl_throwsIllegalArgumentException() {
        when(urlValidationEngine.validateAndNormalize(anyString()))
            .thenThrow(new IllegalArgumentException("Invalid sitemap URL"));

        assertThrows(IllegalArgumentException.class, () ->
            sitemapCrawlerService.auditSitemap("https://example.com/invalid.xml", 5)
        );
    }

    @Test
    void computeDelta_noPreviousSnapshots_throwsIllegalArgumentException() {
        when(urlValidationEngine.validateAndNormalize(anyString()))
            .thenReturn("https://example.com/sitemap.xml");
        when(sitemapSnapshotRepository.findBySitemapUrlOrderByCrawlTimestampDesc(anyString(), any(PageRequest.class)))
            .thenReturn(List.of());

        assertThrows(IllegalArgumentException.class, () ->
            sitemapCrawlerService.computeDelta("https://example.com/sitemap.xml")
        );
    }

    @Test
    void computeDelta_singleSnapshot_returnsInitialDelta() {
        when(urlValidationEngine.validateAndNormalize(anyString()))
            .thenReturn("https://example.com/sitemap.xml");

        SitemapSnapshot snapshot = SitemapSnapshot.builder()
            .id("snap-1")
            .sitemapUrl("https://example.com/sitemap.xml")
            .domain("example.com")
            .totalUrls(2)
            .averageScore(85.0)
            .urlScores(Map.of("https://example.com/page1", 90, "https://example.com/page2", 80))
            .crawlTimestamp(Instant.now())
            .build();

        when(sitemapSnapshotRepository.findBySitemapUrlOrderByCrawlTimestampDesc(anyString(), any(PageRequest.class)))
            .thenReturn(List.of(snapshot));

        SitemapDeltaResponse delta = sitemapCrawlerService.computeDelta("https://example.com/sitemap.xml");

        assertNotNull(delta);
        assertEquals(2, delta.getNewPages().size());
        assertEquals(0, delta.getRemovedPages().size());
        assertEquals(0, delta.getScoreRegressions().size());
        assertEquals(0, delta.getScoreImprovements().size());
    }

    @Test
    void computeDelta_twoSnapshots_calculatesRegressionsAndImprovements() {
        when(urlValidationEngine.validateAndNormalize(anyString()))
            .thenReturn("https://example.com/sitemap.xml");

        SitemapSnapshot current = SitemapSnapshot.builder()
            .id("snap-2")
            .sitemapUrl("https://example.com/sitemap.xml")
            .domain("example.com")
            .totalUrls(3)
            .averageScore(75.0)
            .urlScores(Map.of(
                "https://example.com/improved", 90,
                "https://example.com/regressed", 60,
                "https://example.com/new", 80
            ))
            .crawlTimestamp(Instant.now())
            .build();

        SitemapSnapshot previous = SitemapSnapshot.builder()
            .id("snap-1")
            .sitemapUrl("https://example.com/sitemap.xml")
            .domain("example.com")
            .totalUrls(3)
            .averageScore(78.0)
            .urlScores(Map.of(
                "https://example.com/improved", 70,
                "https://example.com/regressed", 85,
                "https://example.com/removed", 75
            ))
            .crawlTimestamp(Instant.now().minusSeconds(3600))
            .build();

        when(sitemapSnapshotRepository.findBySitemapUrlOrderByCrawlTimestampDesc(anyString(), any(PageRequest.class)))
            .thenReturn(List.of(current, previous));

        SitemapDeltaResponse delta = sitemapCrawlerService.computeDelta("https://example.com/sitemap.xml");

        assertNotNull(delta);
        assertTrue(delta.getNewPages().contains("https://example.com/new"));
        assertTrue(delta.getRemovedPages().contains("https://example.com/removed"));
        assertEquals(1, delta.getScoreRegressions().size());
        assertEquals("https://example.com/regressed", delta.getScoreRegressions().get(0).getUrl());
        assertEquals(25, delta.getScoreRegressions().get(0).getScoreDrop());
        assertEquals(1, delta.getScoreImprovements().size());
        assertEquals("https://example.com/improved", delta.getScoreImprovements().get(0).getUrl());
        assertEquals(20, delta.getScoreImprovements().get(0).getScoreGain());
    }
}

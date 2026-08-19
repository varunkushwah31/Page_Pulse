package com.pulse.page.web.engine;

import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AuditScoringEngineTest {

    private AuditScoringEngine scoringEngine;

    @BeforeEach
    void setUp() {
        scoringEngine = new AuditScoringEngine();
    }

    @Test
    void calculateScore_highQualityMetrics_returnsExcellentScore() {
        SeoMetrics seo = SeoMetrics.builder()
                .pageTitle("A valid page title between 30 and 60 chars")
                .titleLength(42)
                .hasTitle(true)
                .metaDescription("This is a comprehensive meta description text that satisfies length requirements between 120 and 160 characters long.")
                .descriptionLength(135)
                .hasMetaDescription(true)
                .canonicalUrl("https://example.com")
                .canonicalStatus("SELF_REFERENCING")
                .openGraphTags(Map.of("og:title", "Title", "og:description", "Desc", "og:image", "img.png", "og:url", "https://example.com"))
                .openGraphComplete(true)
                .twitterCardComplete(true)
                .structuredDataInfo(StructuredDataInfo.builder().hasStructuredData(true).validJsonLd(true).build())
                .isIndexable(true)
                .hasViewportMeta(true)
                .hasFavicon(true)
                .build();

        ContentMetrics content = ContentMetrics.builder()
                .headingCounts(Map.of("h1", 1, "h2", 3))
                .hasValidHeadingHierarchy(true)
                .wordCount(650)
                .paragraphCount(5)
                .textToHtmlRatioPercentage(18.5)
                .readabilityMetrics(ReadabilityMetrics.builder().fleschKincaidReadingEase(72.0).build())
                .build();

        AccessibilityMetrics a11y = AccessibilityMetrics.builder()
                .totalImageCount(4)
                .imagesMissingAltCount(0)
                .hasHtmlLangAttribute(true)
                .htmlLangValue("en")
                .validLangCode(true)
                .formInputsMissingLabelsCount(0)
                .buttonsMissingAccessibleNameCount(0)
                .hasMainLandmark(true)
                .build();

        PerformanceMetrics perf = PerformanceMetrics.builder()
                .statusCode(200)
                .responseTimeMs(180L)
                .isSecureSsl(true)
                .modernImageRatioPercentage(85.0)
                .renderBlockingHeadScriptsCount(0)
                .hasCompression(true)
                .hasBrowserCaching(true)
                .build();

        AuditScoreBreakdown breakdown = scoringEngine.calculateScore(seo, content, a11y, perf);

        assertNotNull(breakdown);
        assertEquals(HealthGrade.EXCELLENT, breakdown.getHealthGrade());
        assertTrue(breakdown.getOverallScore() >= 85);
    }

    @Test
    void calculateScore_poorMetrics_returnsPoorScore() {
        SeoMetrics seo = SeoMetrics.builder().build();
        ContentMetrics content = ContentMetrics.builder().wordCount(20).build();
        AccessibilityMetrics a11y = AccessibilityMetrics.builder().totalImageCount(10).imagesMissingAltCount(10).build();
        PerformanceMetrics perf = PerformanceMetrics.builder().statusCode(500).responseTimeMs(4000L).build();

        AuditScoreBreakdown breakdown = scoringEngine.calculateScore(seo, content, a11y, perf);

        assertNotNull(breakdown);
        assertEquals(HealthGrade.POOR, breakdown.getHealthGrade());
        assertTrue(breakdown.getOverallScore() < 50);
    }
}

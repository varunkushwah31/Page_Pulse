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
            .openGraphTags(Map.of("og:title", "Title"))
            .isIndexable(true)
            .build();

        ContentMetrics content = ContentMetrics.builder()
            .headingCounts(Map.of("h1", 1, "h2", 3))
            .wordCount(450)
            .paragraphCount(5)
            .textToHtmlRatioPercentage(18.5)
            .build();

        AccessibilityMetrics a11y = AccessibilityMetrics.builder()
            .totalImageCount(4)
            .imagesMissingAltCount(0)
            .hasHtmlLangAttribute(true)
            .htmlLangValue("en")
            .formInputsMissingLabelsCount(0)
            .build();

        PerformanceMetrics perf = PerformanceMetrics.builder()
            .statusCode(200)
            .responseTimeMs(180L)
            .isSecureSsl(true)
            .build();

        AuditScoreBreakdown breakdown = scoringEngine.calculateScore(seo, content, a11y, perf);

        assertNotNull(breakdown);
        assertEquals(HealthGrade.EXCELLENT, breakdown.getHealthGrade());
        assertTrue(breakdown.getOverallScore() >= 85);
    }
}

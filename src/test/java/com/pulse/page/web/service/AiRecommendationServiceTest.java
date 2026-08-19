package com.pulse.page.web.service;

import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.model.AccessibilityMetrics;
import com.pulse.page.web.model.ContentMetrics;
import com.pulse.page.web.model.SeoMetrics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AiRecommendationServiceTest {

    private AiRecommendationService service;

    @BeforeEach
    void setUp() {
        service = new AiRecommendationService();
    }

    @Test
    void generateRecommendationsMissingTitleAndAltImagesReturnsTailoredFixes() {
        SeoMetrics seo = SeoMetrics.builder()
            .hasTitle(false)
            .pageTitle(null)
            .hasMetaDescription(false)
            .hasViewportMeta(false)
            .hasOgImage(false)
            .hasStructuredData(false)
            .build();

        AccessibilityMetrics a11y = AccessibilityMetrics.builder()
            .imagesMissingAltCount(3)
            .hasHtmlLangAttribute(false)
            .build();

        ContentMetrics content = ContentMetrics.builder()
            .headingCounts(Map.of("h1", 0))
            .wordCount(250)
            .build();

        AuditResponse audit = AuditResponse.builder()
            .id(1L)
            .url("https://example.com")
            .domain("example.com")
            .seoMetrics(seo)
            .accessibilityMetrics(a11y)
            .contentMetrics(content)
            .build();

        List<AiRecommendationDto> recommendations = service.generateRecommendations(audit);

        assertNotNull(recommendations);
        assertFalse(recommendations.isEmpty());
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("SEO") && r.getTitle().contains("Title")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("ACCESSIBILITY") && r.getTitle().contains("Alt")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCodeSnippet().contains("<title>")));
    }
}

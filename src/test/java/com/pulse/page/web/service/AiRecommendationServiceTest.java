package com.pulse.page.web.service;

import com.pulse.page.web.config.AppProperties;
import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AiRecommendationServiceTest {

    private AiRecommendationService service;

    @BeforeEach
    void setUp() {
        AppProperties appProperties = new AppProperties();
        service = new AiRecommendationService(appProperties);
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
            .formInputsMissingLabelsCount(2)
            .build();

        ContentMetrics content = ContentMetrics.builder()
            .headingCounts(Map.of("h1", 0))
            .wordCount(250)
            .build();

        PerformanceMetrics perf = PerformanceMetrics.builder()
            .renderBlockingHeadScriptsCount(2)
            .legacyImageFormatsCount(5)
            .modernImageRatioPercentage(20.0)
            .build();

        LinkInspectionMetrics links = LinkInspectionMetrics.builder()
            .targetBlankWithoutNoopenerCount(3)
            .build();

        SecurityMetrics sec = SecurityMetrics.builder()
            .hasMixedContent(true)
            .mixedContentCount(2)
            .build();

        AssetBottleneckMetrics bottlenecks = AssetBottleneckMetrics.builder()
            .unSizedImagesCount(4)
            .build();

        AuditResponse audit = AuditResponse.builder()
            .id(1L)
            .url("https://example.com")
            .domain("example.com")
            .seoMetrics(seo)
            .accessibilityMetrics(a11y)
            .contentMetrics(content)
            .performanceMetrics(perf)
            .linkMetrics(links)
            .securityMetrics(sec)
            .assetBottleneckMetrics(bottlenecks)
            .build();

        List<AiRecommendationDto> recommendations = service.generateRecommendations(audit);

        assertNotNull(recommendations);
        assertFalse(recommendations.isEmpty());
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("SEO") && r.getTitle().contains("Title")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("ACCESSIBILITY") && r.getTitle().contains("Alt")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("ACCESSIBILITY") && r.getTitle().contains("Labels")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("CONTENT") && r.getTitle().contains("Heading")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("PERFORMANCE") && r.getTitle().contains("defer")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("PERFORMANCE") && r.getTitle().contains("CLS")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("SECURITY") && r.getTitle().contains("Reverse Tabnabbing")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCategory().equals("SECURITY") && r.getTitle().contains("HTTPS")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getCodeSnippet().contains("<title>")));
        assertTrue(recommendations.stream().anyMatch(r -> r.getDiffSnippet() != null && !r.getDiffSnippet().isBlank()));
    }
}


package com.pulse.page.web.engine;

import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class AuditScoringEngine {

    public AuditScoreBreakdown calculateScore(SeoMetrics seo, ContentMetrics content,
                                               AccessibilityMetrics a11y, PerformanceMetrics perf) {
        int seoScore = computeSeoScore(seo);
        int contentScore = computeContentScore(content);
        int a11yScore = computeAccessibilityScore(a11y);
        int perfScore = computePerformanceScore(perf);

        double weightedOverall = (seoScore * 0.30) + (contentScore * 0.25) + (perfScore * 0.25) + (a11yScore * 0.20);
        int overallScore = (int) Math.round(weightedOverall);
        overallScore = Math.clamp(overallScore, 0, 100);

        HealthGrade grade = HealthGrade.fromScore(overallScore);

        return AuditScoreBreakdown.builder()
                .seoScore(seoScore)
                .contentScore(contentScore)
                .accessibilityScore(a11yScore)
                .performanceScore(perfScore)
                .overallScore(overallScore)
                .healthGrade(grade)
                .build();
    }

    private int computeSeoScore(SeoMetrics seo) {
        if (seo == null) return 0;
        int score = 0;

        // Title Tag (20 pts)
        if (seo.isHasTitle()) {
            score += 10;
            if (seo.getTitleLength() >= 30 && seo.getTitleLength() <= 60) {
                score += 10;
            } else if (seo.getTitleLength() > 0) {
                score += 5;
            }
        }

        // Meta Description (20 pts)
        if (seo.isHasMetaDescription()) {
            score += 10;
            if (seo.getDescriptionLength() >= 120 && seo.getDescriptionLength() <= 160) {
                score += 10;
            } else if (seo.getDescriptionLength() > 0) {
                score += 5;
            }
        }

        // Canonical URL (15 pts)
        if ("SELF_REFERENCING".equals(seo.getCanonicalStatus()) || "DECLARED".equals(seo.getCanonicalStatus())) {
            score += 15;
        } else if ("CROSS_DOMAIN".equals(seo.getCanonicalStatus())) {
            score += 10;
        } else if ("MULTIPLE_CONFLICTING".equals(seo.getCanonicalStatus())) {
            score = Math.max(0, score - 10);
        }

        // Structured Data / Schema.org (15 pts)
        if (seo.getStructuredDataInfo() != null && seo.getStructuredDataInfo().isHasStructuredData()) {
            if (seo.getStructuredDataInfo().isValidJsonLd()) {
                score += 15;
            } else {
                score += 5; // Has schema but malformed
            }
        } else if (seo.isHasStructuredData()) {
            score += 10;
        }

        // Social Metadata / OpenGraph & Twitter (15 pts)
        if (seo.isOpenGraphComplete() && seo.isTwitterCardComplete()) {
            score += 15;
        } else if (seo.getOpenGraphTags() != null && !seo.getOpenGraphTags().isEmpty()) {
            score += 10;
        }

        // Mobile & Crawlability (15 pts)
        if (seo.isIndexable()) {
            score += 5;
        }
        if (seo.isHasViewportMeta()) {
            score += 5;
        }
        if (seo.isHasFavicon()) {
            score += 5;
        }

        return Math.clamp(score, 0, 100);
    }

    private int computeContentScore(ContentMetrics content) {
        if (content == null) return 0;
        int score = 0;

        // Heading Structure & Hierarchy (25 pts)
        int h1Count = content.getHeadingCounts() != null ? content.getHeadingCounts().getOrDefault("h1", 0) : 0;
        if (h1Count == 1) {
            score += 15;
        } else if (h1Count > 1) {
            score += 8;
        }

        if (content.isHasValidHeadingHierarchy()) {
            score += 10;
        } else if (content.getHeadingIssues() != null && content.getHeadingIssues().size() <= 2) {
            score += 5;
        }

        // Word Count & Content Depth (30 pts)
        if (content.getWordCount() >= 600) {
            score += 30;
        } else if (content.getWordCount() >= 300) {
            score += 20;
        } else if (content.getWordCount() >= 100) {
            score += 10;
        } else if (content.getWordCount() > 0) {
            score += 5;
        }

        // Readability (25 pts)
        if (content.getReadabilityMetrics() != null) {
            double readingEase = content.getReadabilityMetrics().getFleschKincaidReadingEase();
            if (readingEase >= 50 && readingEase <= 90) {
                score += 25; // Optimal readability for web users
            } else if (readingEase > 0) {
                score += 15;
            }
        } else {
            score += 15;
        }

        // Keyword Density & Quality (10 pts)
        if (!content.isHasKeywordStuffing() && content.getTopKeywords() != null && !content.getTopKeywords().isEmpty()) {
            score += 10;
        } else if (!content.isHasKeywordStuffing()) {
            score += 5;
        }

        // Paragraphs & Structure (10 pts)
        if (content.getParagraphCount() >= 3) {
            score += 5;
        }
        if (content.getTextToHtmlRatioPercentage() >= 10.0) {
            score += 5;
        }

        return Math.clamp(score, 0, 100);
    }

    private int computeAccessibilityScore(AccessibilityMetrics a11y) {
        if (a11y == null) return 0;
        int score = 0;

        // Image Alternative Text (35 pts)
        if (a11y.getTotalImageCount() == 0) {
            score += 35;
        } else {
            double altRatio = (double) (a11y.getTotalImageCount() - a11y.getImagesMissingAltCount()) / a11y.getTotalImageCount();
            score += (int) (altRatio * 35);
        }

        // Language Attribute (20 pts)
        if (a11y.isHasHtmlLangAttribute() && a11y.isValidLangCode()) {
            score += 20;
        } else if (a11y.isHasHtmlLangAttribute()) {
            score += 10;
        }

        // Form Control Labels (20 pts)
        if (a11y.getFormInputsMissingLabelsCount() == 0) {
            score += 20;
        } else {
            score += Math.max(0, 20 - (a11y.getFormInputsMissingLabelsCount() * 4));
        }

        // Interactive Button & Link Accessible Names (15 pts)
        int namelessInteractive = a11y.getButtonsMissingAccessibleNameCount() + a11y.getLinksMissingAccessibleTextCount();
        if (namelessInteractive == 0) {
            score += 15;
        } else {
            score += Math.max(0, 15 - (namelessInteractive * 3));
        }

        // Semantic Landmarks & Tabindex (10 pts)
        if (a11y.isHasMainLandmark()) {
            score += 5;
        }
        if (a11y.getPositiveTabindexCount() == 0) {
            score += 5;
        }

        return Math.clamp(score, 0, 100);
    }

    private int computePerformanceScore(PerformanceMetrics perf) {
        if (perf == null) return 0;
        int score = 0;

        // HTTP Status Code (30 pts)
        if (perf.getStatusCode() == 200) {
            score += 30;
        } else if (perf.getStatusCode() >= 200 && perf.getStatusCode() < 400) {
            score += 20;
        }

        // Response Time (30 pts)
        long responseTime = perf.getResponseTimeMs();
        if (responseTime <= 300) {
            score += 30;
        } else if (responseTime <= 800) {
            score += 24;
        } else if (responseTime <= 1500) {
            score += 16;
        } else if (responseTime <= 3000) {
            score += 8;
        }

        // SSL / HTTPS Security (10 pts)
        if (perf.isSecureSsl()) {
            score += 10;
        }

        // Modern Images & Render-Blocking Optimization (15 pts)
        if (perf.getModernImageRatioPercentage() >= 60.0 || perf.getImageResourceCount() == 0) {
            score += 8;
        } else if (perf.getModernImageRatioPercentage() > 0) {
            score += 4;
        }

        if (perf.getRenderBlockingHeadScriptsCount() == 0) {
            score += 7;
        } else if (perf.getRenderBlockingHeadScriptsCount() <= 2) {
            score += 3;
        }

        // Caching & Compression (15 pts)
        if (perf.isHasCompression()) {
            score += 8;
        }
        if (perf.isHasBrowserCaching()) {
            score += 7;
        }

        return Math.clamp(score, 0, 100);
    }
}

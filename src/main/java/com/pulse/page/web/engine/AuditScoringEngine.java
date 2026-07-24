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

        double weightedOverall = (seoScore * 0.35) + (contentScore * 0.25) + (a11yScore * 0.20) + (perfScore * 0.20);
        int overallScore = (int) Math.round(weightedOverall);

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
        int score = 0;
        if (seo.isHasTitle()) {
            score += 20;
            if (seo.getTitleLength() >= 30 && seo.getTitleLength() <= 60) {
                score += 10;
            }
        }
        if (seo.isHasMetaDescription()) {
            score += 25;
            if (seo.getDescriptionLength() >= 120 && seo.getDescriptionLength() <= 160) {
                score += 10;
            }
        }
        if (seo.getCanonicalUrl() != null) {
            score += 15;
        }
        if (seo.getOpenGraphTags() != null && !seo.getOpenGraphTags().isEmpty()) {
            score += 10;
        }
        if (seo.isIndexable()) {
            score += 10;
        }
        return Math.min(100, score);
    }

    private int computeContentScore(ContentMetrics content) {
        int score = 0;
        int h1Count = content.getHeadingCounts() != null ? content.getHeadingCounts().getOrDefault("h1", 0) : 0;
        if (h1Count == 1) {
            score += 30;
        } else if (h1Count > 1) {
            score += 15;
        }

        if (content.getWordCount() >= 300) {
            score += 35;
        } else if (content.getWordCount() >= 100) {
            score += 20;
        } else if (content.getWordCount() > 0) {
            score += 10;
        }

        if (content.getParagraphCount() >= 3) {
            score += 20;
        } else if (content.getParagraphCount() > 0) {
            score += 10;
        }

        if (content.getTextToHtmlRatioPercentage() >= 10.0) {
            score += 15;
        } else if (content.getTextToHtmlRatioPercentage() > 0) {
            score += 5;
        }
        return Math.min(100, score);
    }

    private int computeAccessibilityScore(AccessibilityMetrics a11y) {
        int score = 0;
        if (a11y.getTotalImageCount() == 0) {
            score += 50;
        } else {
            double altRatio = (double) (a11y.getTotalImageCount() - a11y.getImagesMissingAltCount()) / a11y.getTotalImageCount();
            score += (int) (altRatio * 50);
        }

        if (a11y.isHasHtmlLangAttribute()) {
            score += 30;
        }

        if (a11y.getFormInputsMissingLabelsCount() == 0) {
            score += 20;
        } else {
            score += Math.max(0, 20 - (a11y.getFormInputsMissingLabelsCount() * 5));
        }

        return Math.min(100, score);
    }

    private int computePerformanceScore(PerformanceMetrics perf) {
        int score = 0;
        if (perf.getStatusCode() == 200) {
            score += 40;
        } else if (perf.getStatusCode() >= 200 && perf.getStatusCode() < 400) {
            score += 25;
        }

        long responseTime = perf.getResponseTimeMs();
        if (responseTime <= 300) {
            score += 40;
        } else if (responseTime <= 800) {
            score += 30;
        } else if (responseTime <= 1500) {
            score += 20;
        } else if (responseTime <= 3000) {
            score += 10;
        }

        if (perf.isSecureSsl()) {
            score += 20;
        }
        return Math.min(100, score);
    }
}

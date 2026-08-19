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
        int score = scoreTitle(seo)
                + scoreMetaDescription(seo)
                + scoreCanonical(seo)
                + scoreStructuredData(seo)
                + scoreSocialAndCrawlability(seo);
        return Math.clamp(score, 0, 100);
    }

    private int scoreTitle(SeoMetrics seo) {
        if (!seo.isHasTitle()) return 0;
        int pts = 10;
        if (seo.getTitleLength() >= 30 && seo.getTitleLength() <= 60) {
            pts += 10;
        } else if (seo.getTitleLength() > 0) {
            pts += 5;
        }
        return pts;
    }

    private int scoreMetaDescription(SeoMetrics seo) {
        if (!seo.isHasMetaDescription()) return 0;
        int pts = 10;
        if (seo.getDescriptionLength() >= 120 && seo.getDescriptionLength() <= 160) {
            pts += 10;
        } else if (seo.getDescriptionLength() > 0) {
            pts += 5;
        }
        return pts;
    }

    private int scoreCanonical(SeoMetrics seo) {
        String status = seo.getCanonicalStatus();
        if ("SELF_REFERENCING".equals(status) || "DECLARED".equals(status)) {
            return 15;
        } else if ("CROSS_DOMAIN".equals(status)) {
            return 10;
        } else if ("MULTIPLE_CONFLICTING".equals(status)) {
            return -10;
        }
        return 0;
    }

    private int scoreStructuredData(SeoMetrics seo) {
        if (seo.getStructuredDataInfo() != null && seo.getStructuredDataInfo().isHasStructuredData()) {
            return seo.getStructuredDataInfo().isValidJsonLd() ? 15 : 5;
        } else if (seo.isHasStructuredData()) {
            return 10;
        }
        return 0;
    }

    private int scoreSocialAndCrawlability(SeoMetrics seo) {
        int pts = 0;
        if (seo.isOpenGraphComplete() && seo.isTwitterCardComplete()) {
            pts += 15;
        } else if (seo.getOpenGraphTags() != null && !seo.getOpenGraphTags().isEmpty()) {
            pts += 10;
        }

        if (seo.isIndexable()) pts += 5;
        if (seo.isHasViewportMeta()) pts += 5;
        if (seo.isHasFavicon()) pts += 5;
        return pts;
    }

    private int computeContentScore(ContentMetrics content) {
        if (content == null) return 0;
        int score = scoreHeadings(content)
                + scoreWordCount(content)
                + scoreReadability(content)
                + scoreKeywordsAndStructure(content);
        return Math.clamp(score, 0, 100);
    }

    private int scoreHeadings(ContentMetrics content) {
        int pts = 0;
        int h1Count = content.getHeadingCounts() != null ? content.getHeadingCounts().getOrDefault("h1", 0) : 0;
        if (h1Count == 1) {
            pts += 15;
        } else if (h1Count > 1) {
            pts += 8;
        }

        if (content.isHasValidHeadingHierarchy()) {
            pts += 10;
        } else if (content.getHeadingIssues() != null && content.getHeadingIssues().size() <= 2) {
            pts += 5;
        }
        return pts;
    }

    private int scoreWordCount(ContentMetrics content) {
        int words = content.getWordCount();
        if (words >= 600) return 30;
        if (words >= 300) return 20;
        if (words >= 100) return 10;
        if (words > 0) return 5;
        return 0;
    }

    private int scoreReadability(ContentMetrics content) {
        if (content.getReadabilityMetrics() != null) {
            double readingEase = content.getReadabilityMetrics().getFleschKincaidReadingEase();
            if (readingEase >= 50 && readingEase <= 90) {
                return 25;
            } else if (readingEase > 0) {
                return 15;
            }
        }
        return 15;
    }

    private int scoreKeywordsAndStructure(ContentMetrics content) {
        int pts = 0;
        if (!content.isHasKeywordStuffing() && content.getTopKeywords() != null && !content.getTopKeywords().isEmpty()) {
            pts += 10;
        } else if (!content.isHasKeywordStuffing()) {
            pts += 5;
        }

        if (content.getParagraphCount() >= 3) pts += 5;
        if (content.getTextToHtmlRatioPercentage() >= 10.0) pts += 5;
        return pts;
    }

    private int computeAccessibilityScore(AccessibilityMetrics a11y) {
        if (a11y == null) return 0;
        int score = scoreImages(a11y)
                + scoreLanguage(a11y)
                + scoreFormLabels(a11y)
                + scoreInteractiveElements(a11y)
                + scoreLandmarks(a11y);
        return Math.clamp(score, 0, 100);
    }

    private int scoreImages(AccessibilityMetrics a11y) {
        if (a11y.getTotalImageCount() == 0) return 35;
        double altRatio = (double) (a11y.getTotalImageCount() - a11y.getImagesMissingAltCount()) / a11y.getTotalImageCount();
        return (int) (altRatio * 35);
    }

    private int scoreLanguage(AccessibilityMetrics a11y) {
        if (a11y.isHasHtmlLangAttribute() && a11y.isValidLangCode()) return 20;
        if (a11y.isHasHtmlLangAttribute()) return 10;
        return 0;
    }

    private int scoreFormLabels(AccessibilityMetrics a11y) {
        int missing = a11y.getFormInputsMissingLabelsCount();
        return missing == 0 ? 20 : Math.max(0, 20 - (missing * 4));
    }

    private int scoreInteractiveElements(AccessibilityMetrics a11y) {
        int nameless = a11y.getButtonsMissingAccessibleNameCount() + a11y.getLinksMissingAccessibleTextCount();
        return nameless == 0 ? 15 : Math.max(0, 15 - (nameless * 3));
    }

    private int scoreLandmarks(AccessibilityMetrics a11y) {
        int pts = 0;
        if (a11y.isHasMainLandmark()) pts += 5;
        if (a11y.getPositiveTabindexCount() == 0) pts += 5;
        return pts;
    }

    private int computePerformanceScore(PerformanceMetrics perf) {
        if (perf == null) return 0;
        int score = scoreHttpStatus(perf)
                + scoreResponseTime(perf)
                + scoreAssetsAndCaching(perf);
        return Math.clamp(score, 0, 100);
    }

    private int scoreHttpStatus(PerformanceMetrics perf) {
        int status = perf.getStatusCode();
        if (status == 200) return 30;
        if (status >= 200 && status < 400) return 20;
        return 0;
    }

    private int scoreResponseTime(PerformanceMetrics perf) {
        long responseTime = perf.getResponseTimeMs();
        if (responseTime <= 300) return 30;
        if (responseTime <= 800) return 24;
        if (responseTime <= 1500) return 16;
        if (responseTime <= 3000) return 8;
        return 0;
    }

    private int scoreAssetsAndCaching(PerformanceMetrics perf) {
        int pts = 0;
        if (perf.isSecureSsl()) pts += 10;

        if (perf.getModernImageRatioPercentage() >= 60.0 || perf.getImageResourceCount() == 0) {
            pts += 8;
        } else if (perf.getModernImageRatioPercentage() > 0) {
            pts += 4;
        }

        if (perf.getRenderBlockingHeadScriptsCount() == 0) {
            pts += 7;
        } else if (perf.getRenderBlockingHeadScriptsCount() <= 2) {
            pts += 3;
        }

        if (perf.isHasCompression()) pts += 8;
        if (perf.isHasBrowserCaching()) pts += 7;
        return pts;
    }
}

package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.engine.*;
import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.engine.extractor.AccessibilityMetricsExtractor;
import com.pulse.page.web.engine.extractor.ContentMetricsExtractor;
import com.pulse.page.web.engine.extractor.PerformanceMetricsExtractor;
import com.pulse.page.web.engine.extractor.SeoMetricsExtractor;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.model.*;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditReportProcessorService {

    private final UrlValidationEngine urlValidationEngine;
    private final PageScraperEngine pageScraperEngine;
    private final SeoMetricsExtractor seoExtractor;
    private final ContentMetricsExtractor contentExtractor;
    private final AccessibilityMetricsExtractor accessibilityExtractor;
    private final PerformanceMetricsExtractor performanceExtractor;
    private final AuditScoringEngine scoringEngine;
    private final SslInspectionEngine sslInspectionEngine;
    private final LinkInspectionEngine linkInspectionEngine;
    private final PageSpeedMetricsEngine pageSpeedMetricsEngine;
    private final AuditReportJpaRepository jpaRepository;
    private final CacheService cacheService;

    @NonNull
    @Transactional
    public AuditResponse processAudit(@NonNull String rawUrl) throws IOException {
        Objects.requireNonNull(rawUrl, "rawUrl parameter must not be null");

        String normalizedUrl = urlValidationEngine.validateAndNormalize(rawUrl);
        String domain = urlValidationEngine.extractDomain(normalizedUrl);

        Optional<AuditResponse> cachedResponse = cacheService.getCachedAudit(normalizedUrl);
        if (cachedResponse.isPresent()) {
            return cachedResponse.get();
        }

        ScrapeResult scrapeResult = pageScraperEngine.fetchPage(normalizedUrl);

        SeoMetrics seo = seoExtractor.extract(scrapeResult.getDocument());
        ContentMetrics content = contentExtractor.extract(scrapeResult.getDocument());
        AccessibilityMetrics a11y = accessibilityExtractor.extract(scrapeResult.getDocument());
        PerformanceMetrics perf = performanceExtractor.extract(scrapeResult);

        CoreWebVitals vitals = pageSpeedMetricsEngine.calculateWebVitals(scrapeResult);
        SecurityMetrics security = sslInspectionEngine.inspectSecurity(normalizedUrl, scrapeResult);
        LinkInspectionMetrics links = linkInspectionEngine.inspectLinks(normalizedUrl, scrapeResult.getDocument());

        AuditScoreBreakdown scores = scoringEngine.calculateScore(seo, content, a11y, perf);

        AuditReportEntity entity = AuditReportEntity.builder()
            .url(normalizedUrl)
            .domain(domain)
            .httpStatus(scrapeResult.getStatusCode())
            .responseTimeMs(scrapeResult.getResponseTimeMs())
            .pageTitle(seo.getPageTitle())
            .metaDescription(seo.getMetaDescription())
            .h1Count(content.getHeadingCounts() != null ? content.getHeadingCounts().getOrDefault("h1", 0) : 0)
            .imagesMissingAltCount(a11y.getImagesMissingAltCount())
            .wordCount(content.getWordCount())
            .contentType(scrapeResult.getContentType())
            .seoScore(scores.getSeoScore())
            .contentScore(scores.getContentScore())
            .accessibilityScore(scores.getAccessibilityScore())
            .performanceScore(scores.getPerformanceScore())
            .overallScore(scores.getOverallScore())
            .healthGrade(scores.getHealthGrade())
            .build();

        AuditReportEntity savedEntity = jpaRepository.save(entity);

        AuditResponse response = AuditResponse.builder()
            .id(savedEntity.getId())
            .url(normalizedUrl)
            .domain(domain)
            .httpStatus(scrapeResult.getStatusCode())
            .responseTimeMs(scrapeResult.getResponseTimeMs())
            .contentType(scrapeResult.getContentType())
            .seoMetrics(seo)
            .contentMetrics(content)
            .accessibilityMetrics(a11y)
            .performanceMetrics(perf)
            .coreWebVitals(vitals)
            .linkMetrics(links)
            .securityMetrics(security)
            .scores(scores)
            .cached(false)
            .build();

        cacheService.cacheAudit(normalizedUrl, response);
        return response;
    }
}

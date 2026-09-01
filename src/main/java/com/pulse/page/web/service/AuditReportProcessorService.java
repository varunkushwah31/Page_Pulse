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
    private final PlaywrightScraperEngine playwrightScraperEngine;
    private final SeoMetricsExtractor seoExtractor;
    private final ContentMetricsExtractor contentExtractor;
    private final AccessibilityMetricsExtractor accessibilityExtractor;
    private final PerformanceMetricsExtractor performanceExtractor;
    private final AuditScoringEngine scoringEngine;
    private final SslInspectionEngine sslInspectionEngine;
    private final LinkInspectionEngine linkInspectionEngine;
    private final PageSpeedMetricsEngine pageSpeedMetricsEngine;
    private final AssetBottleneckInspectorEngine assetBottleneckInspectorEngine;
    private final AuditReportJpaRepository jpaRepository;
    private final CacheService cacheService;

    @NonNull
    @Transactional(rollbackFor = Exception.class)
    public AuditResponse processAudit(@NonNull String rawUrl) throws IOException {
        return executeAudit(rawUrl, false);
    }

    @NonNull
    @Transactional(rollbackFor = Exception.class)
    public AuditResponse processAudit(@NonNull String rawUrl, boolean enableJsRendering) throws IOException {
        return executeAudit(rawUrl, enableJsRendering);
    }

    private AuditResponse executeAudit(String rawUrl, boolean enableJsRendering) throws IOException {
        Objects.requireNonNull(rawUrl, "rawUrl parameter must not be null");

        long auditStartTime = System.currentTimeMillis();
        String normalizedUrl = urlValidationEngine.validateAndNormalize(rawUrl);
        String domain = urlValidationEngine.extractDomain(normalizedUrl);

        log.info("[AUDIT START] Target: '{}' | Domain: '{}' | Mode: {}", 
                normalizedUrl, domain, enableJsRendering ? "PLAYWRIGHT_JS" : "STATIC_HTML");

        if (!enableJsRendering) {
            Optional<AuditResponse> cachedResponse = cacheService.getCachedAudit(normalizedUrl);
            if (cachedResponse.isPresent()) {
                log.info("[AUDIT CACHE HIT] Returned cached audit for '{}' in {}ms", 
                        normalizedUrl, System.currentTimeMillis() - auditStartTime);
                return cachedResponse.get();
            }
        }

        ScrapeResult scrapeResult = enableJsRendering
                ? playwrightScraperEngine.fetchPageWithJs(normalizedUrl)
                : pageScraperEngine.fetchPage(normalizedUrl);

        log.info("[SCRAPE COMPLETE] Target: '{}' | Status: {} | Latency: {}ms | Content-Type: {}",
                normalizedUrl, scrapeResult.getStatusCode(), scrapeResult.getResponseTimeMs(), scrapeResult.getContentType());

        SeoMetrics seo = seoExtractor.extract(scrapeResult.getDocument(), normalizedUrl, scrapeResult.getResponseHeaders());
        ContentMetrics content = contentExtractor.extract(scrapeResult.getDocument());
        AccessibilityMetrics a11y = accessibilityExtractor.extract(scrapeResult.getDocument());
        PerformanceMetrics perf = performanceExtractor.extract(scrapeResult);

        CoreWebVitals vitals = pageSpeedMetricsEngine.calculateWebVitals(scrapeResult);
        SecurityMetrics security = sslInspectionEngine.inspectSecurity(normalizedUrl, scrapeResult);
        LinkInspectionMetrics links = linkInspectionEngine.inspectLinks(normalizedUrl, scrapeResult.getDocument());
        AssetBottleneckMetrics bottlenecks = assetBottleneckInspectorEngine.inspectAssets(scrapeResult.getDocument(), scrapeResult.getResponseTimeMs());

        AuditScoreBreakdown scores = scoringEngine.calculateScore(seo, content, a11y, perf);

        log.info("[AUDIT SCORES] Target: '{}' | Overall: {} ({}) | SEO: {} | Content: {} | A11y: {} | Perf: {}",
                normalizedUrl, scores.getOverallScore(), scores.getHealthGrade(),
                scores.getSeoScore(), scores.getContentScore(), scores.getAccessibilityScore(), scores.getPerformanceScore());

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
            .jsRendered(scrapeResult.isJsRendered())
            .spaFramework(scrapeResult.getSpaFramework())
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
            .assetBottleneckMetrics(bottlenecks)
            .scores(scores)
            .jsRendered(scrapeResult.isJsRendered())
            .spaFramework(scrapeResult.getSpaFramework())
            .jsExecutionTimeMs(scrapeResult.getJsExecutionTimeMs())
            .cached(false)
            .build();

        cacheService.cacheAudit(normalizedUrl, response);
        long totalElapsed = System.currentTimeMillis() - auditStartTime;
        log.info("[AUDIT SUCCESS] Target: '{}' completed in {}ms (Saved ID: #{})", 
                normalizedUrl, totalElapsed, savedEntity.getId());
        return response;
    }
}

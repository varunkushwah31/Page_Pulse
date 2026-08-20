package com.pulse.page.web.controller;

import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.model.*;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.service.AiRecommendationService;
import com.pulse.page.web.service.AuditReportProcessorService;
import com.pulse.page.web.service.CacheService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/ai")
public class AiRecommendationController {

    private final AiRecommendationService recommendationService;
    private final AuditReportJpaRepository jpaRepository;
    private final AuditReportProcessorService processorService;
    private final CacheService cacheService;

    public AiRecommendationController(
            AiRecommendationService recommendationService,
            AuditReportJpaRepository jpaRepository,
            AuditReportProcessorService processorService,
            CacheService cacheService) {
        this.recommendationService = recommendationService;
        this.jpaRepository = jpaRepository;
        this.processorService = processorService;
        this.cacheService = cacheService;
    }

    @PostMapping("/recommendations")
    public ResponseEntity<List<AiRecommendationDto>> getAiFixRecommendations(@RequestBody AuditResponse audit) {
        List<AiRecommendationDto> recommendations = recommendationService.generateRecommendations(audit);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/recommendations/{tempId}")
    public ResponseEntity<List<AiRecommendationDto>> getAiFixRecommendationsById(@PathVariable("tempId") Long tempId) {
        AuditReportEntity entity = jpaRepository.findById(tempId)
                .orElseThrow(() -> new ReportNotFoundException("Audit report with ID " + tempId + " not found."));

        Optional<AuditResponse> cached = cacheService.getCachedAudit(entity.getUrl());
        if (cached.isPresent()) {
            return ResponseEntity.ok(recommendationService.generateRecommendations(cached.get()));
        }

        AuditResponse constructed = buildAuditResponseFromEntity(entity);
        List<AiRecommendationDto> recommendations = recommendationService.generateRecommendations(constructed);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<AiRecommendationDto>> getAiFixRecommendationsByParam(
            @RequestParam(value = "url", required = false) String url,
            @RequestParam(value = "tempId", required = false) Long tempId) throws IOException {
        if (tempId != null) {
            return getAiFixRecommendationsById(tempId);
        }
        if (url != null && !url.isBlank()) {
            Optional<AuditResponse> cached = cacheService.getCachedAudit(url);
            AuditResponse response = cached.isPresent() ? cached.get() : processorService.processAudit(url);
            return ResponseEntity.ok(recommendationService.generateRecommendations(response));
        }
        return ResponseEntity.badRequest().build();
    }

    private AuditResponse buildAuditResponseFromEntity(AuditReportEntity entity) {
        SeoMetrics seo = SeoMetrics.builder()
                .pageTitle(entity.getPageTitle())
                .hasTitle(entity.getPageTitle() != null && !entity.getPageTitle().isBlank())
                .titleLength(entity.getPageTitle() != null ? entity.getPageTitle().length() : 0)
                .metaDescription(entity.getMetaDescription())
                .hasMetaDescription(entity.getMetaDescription() != null && !entity.getMetaDescription().isBlank())
                .descriptionLength(entity.getMetaDescription() != null ? entity.getMetaDescription().length() : 0)
                .build();

        ContentMetrics content = ContentMetrics.builder()
                .headingCounts(Map.of("h1", entity.getH1Count()))
                .wordCount(entity.getWordCount())
                .isThinContent(entity.getWordCount() < 300)
                .build();

        AccessibilityMetrics a11y = AccessibilityMetrics.builder()
                .imagesMissingAltCount(entity.getImagesMissingAltCount())
                .build();

        PerformanceMetrics perf = PerformanceMetrics.builder()
                .statusCode(entity.getHttpStatus())
                .responseTimeMs(entity.getResponseTimeMs())
                .contentType(entity.getContentType())
                .build();

        AuditScoreBreakdown scores = AuditScoreBreakdown.builder()
                .seoScore(entity.getSeoScore())
                .contentScore(entity.getContentScore())
                .accessibilityScore(entity.getAccessibilityScore())
                .performanceScore(entity.getPerformanceScore())
                .overallScore(entity.getOverallScore())
                .healthGrade(entity.getHealthGrade())
                .build();

        return AuditResponse.builder()
                .id(entity.getId())
                .url(entity.getUrl())
                .domain(entity.getDomain())
                .httpStatus(entity.getHttpStatus())
                .responseTimeMs(entity.getResponseTimeMs())
                .contentType(entity.getContentType())
                .seoMetrics(seo)
                .contentMetrics(content)
                .accessibilityMetrics(a11y)
                .performanceMetrics(perf)
                .scores(scores)
                .build();
    }
}


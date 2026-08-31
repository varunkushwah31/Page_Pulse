package com.pulse.page.web.controller;

import com.pulse.page.web.dto.*;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.entity.UserEntity;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.model.*;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.jpa.UserRepository;
import com.pulse.page.web.service.AiRecommendationService;
import com.pulse.page.web.service.AuditReportProcessorService;
import com.pulse.page.web.service.CacheService;
import com.pulse.page.web.service.GeminiService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/ai")
public class AiRecommendationController {

    private final AiRecommendationService recommendationService;
    private final GeminiService geminiService;
    private final AuditReportJpaRepository jpaRepository;
    private final AuditReportProcessorService processorService;
    private final CacheService cacheService;
    private final UserRepository userRepository;

    public AiRecommendationController(
            AiRecommendationService recommendationService,
            GeminiService geminiService,
            AuditReportJpaRepository jpaRepository,
            AuditReportProcessorService processorService,
            CacheService cacheService,
            UserRepository userRepository) {
        this.recommendationService = recommendationService;
        this.geminiService = geminiService;
        this.jpaRepository = jpaRepository;
        this.processorService = processorService;
        this.cacheService = cacheService;
        this.userRepository = userRepository;
    }

    @PostMapping("/recommendations")
    public ResponseEntity<List<AiRecommendationDto>> getAiFixRecommendations(
            @RequestBody AuditResponse audit,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey) {
        List<AiRecommendationDto> recommendations = (headerApiKey != null && !headerApiKey.isBlank())
                ? recommendationService.generateRecommendations(audit, headerApiKey)
                : recommendationService.generateRecommendations(audit);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/recommendations/{tempId}")
    public ResponseEntity<List<AiRecommendationDto>> getAiFixRecommendationsById(
            @PathVariable("tempId") Long tempId,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey) {
        AuditReportEntity entity = jpaRepository.findById(tempId)
                .orElseThrow(() -> new ReportNotFoundException("Audit report with ID " + tempId + " not found."));

        Optional<AuditResponse> cached = cacheService.getCachedAudit(entity.getUrl());
        if (cached.isPresent()) {
            AuditResponse cachedAudit = cached.get();
            List<AiRecommendationDto> recs = (headerApiKey != null && !headerApiKey.isBlank())
                    ? recommendationService.generateRecommendations(cachedAudit, headerApiKey)
                    : recommendationService.generateRecommendations(cachedAudit);
            return ResponseEntity.ok(recs);
        }

        AuditResponse constructed = buildAuditResponseFromEntity(entity);
        List<AiRecommendationDto> recommendations = (headerApiKey != null && !headerApiKey.isBlank())
                ? recommendationService.generateRecommendations(constructed, headerApiKey)
                : recommendationService.generateRecommendations(constructed);
        return ResponseEntity.ok(recommendations);
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<AiRecommendationDto>> getAiFixRecommendationsByParam(
            @RequestParam(value = "url", required = false) String url,
            @RequestParam(value = "tempId", required = false) Long tempId,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey) throws IOException {
        if (tempId != null) {
            return getAiFixRecommendationsById(tempId, headerApiKey);
        }
        if (url != null && !url.isBlank()) {
            Optional<AuditResponse> cached = cacheService.getCachedAudit(url);
            AuditResponse response = cached.isPresent() ? cached.get() : processorService.processAudit(url);
            List<AiRecommendationDto> recs = (headerApiKey != null && !headerApiKey.isBlank())
                    ? recommendationService.generateRecommendations(response, headerApiKey)
                    : recommendationService.generateRecommendations(response);
            return ResponseEntity.ok(recs);
        }
        return ResponseEntity.badRequest().build();
    }

    @PostMapping("/custom-seo-prompt")
    public ResponseEntity<GeminiCustomPromptResponse> askCustomSeoPrompt(
            @Valid @RequestBody GeminiCustomPromptRequest request,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey,
            @AuthenticationPrincipal UserDetails userDetails) {
        String effectiveKey = resolveGeminiKey(headerApiKey, userDetails);
        GeminiCustomPromptResponse response = geminiService.askCustomSeoQuestion(
                request.getAudit(),
                request.getPrompt(),
                effectiveKey
        );
        return ResponseEntity.ok(response);
    }

    private String resolveGeminiKey(String headerKey, UserDetails userDetails) {
        if (headerKey != null && !headerKey.isBlank()) {
            return headerKey.trim();
        }
        if (userDetails != null) {
            Optional<UserEntity> userOpt = userRepository.findByUsername(userDetails.getUsername());
            if (userOpt.isPresent() && userOpt.get().getGeminiApiKey() != null && !userOpt.get().getGeminiApiKey().isBlank()) {
                return userOpt.get().getGeminiApiKey().trim();
            }
        }
        return null;
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


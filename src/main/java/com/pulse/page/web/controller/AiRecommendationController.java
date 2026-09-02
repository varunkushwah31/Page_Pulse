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

@lombok.extern.slf4j.Slf4j
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
        List<AiRecommendationDto> recommendations = getCachedOrGenerateRecommendations(audit, headerApiKey);
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
            List<AiRecommendationDto> recs = getCachedOrGenerateRecommendations(cachedAudit, headerApiKey);
            return ResponseEntity.ok(recs);
        }

        AuditResponse constructed = buildAuditResponseFromEntity(entity);
        List<AiRecommendationDto> recommendations = getCachedOrGenerateRecommendations(constructed, headerApiKey);
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
            List<AiRecommendationDto> recs = getCachedOrGenerateRecommendations(response, headerApiKey);
            return ResponseEntity.ok(recs);
        }
        return ResponseEntity.badRequest().build();
    }

    private List<AiRecommendationDto> getCachedOrGenerateRecommendations(AuditResponse audit, String headerApiKey) {
        if (audit == null) {
            return List.of();
        }
        String recCacheKey = (audit.getUrl() != null ? audit.getUrl().toLowerCase() : String.valueOf(audit.getId()))
                + ":" + (headerApiKey != null ? headerApiKey.trim().hashCode() : "default");

        if (cacheService != null) {
            Optional<List<AiRecommendationDto>> cached = cacheService.getCachedAiRecommendations(recCacheKey);
            if (cached.isPresent()) {
                log.info("Serving cached AI recommendations for: {}", audit.getUrl());
                return cached.get();
            }
        }

        List<AiRecommendationDto> recs = (headerApiKey != null && !headerApiKey.isBlank())
                ? recommendationService.generateRecommendations(audit, headerApiKey)
                : recommendationService.generateRecommendations(audit);

        if (cacheService != null && recs != null && !recs.isEmpty()) {
            cacheService.cacheAiRecommendations(recCacheKey, recs);
        }
        return recs;
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

    @PostMapping("/title-variations")
    public ResponseEntity<AiTitleVariationsDto> getTitleVariations(
            @RequestBody AuditResponse audit,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey,
            @AuthenticationPrincipal UserDetails userDetails) {
        String effectiveKey = resolveGeminiKey(headerApiKey, userDetails);
        UserAiPreferencesRequest preferences = resolveUserPreferences(null, userDetails);
        AiTitleVariationsDto response = geminiService.generateTitleAndMetaVariations(audit, effectiveKey, preferences);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/executive-summary")
    public ResponseEntity<AiExecutiveSummaryDto> getExecutiveSummary(
            @RequestBody AuditResponse audit,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey,
            @AuthenticationPrincipal UserDetails userDetails) {
        String effectiveKey = resolveGeminiKey(headerApiKey, userDetails);
        UserAiPreferencesRequest preferences = resolveUserPreferences(null, userDetails);
        AiExecutiveSummaryDto response = geminiService.generateExecutiveSummary(audit, effectiveKey, preferences);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/schema-generator")
    public ResponseEntity<AiSchemaGenerationResponse> generateSchema(
            @RequestBody AiSchemaGenerationRequest request,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey,
            @AuthenticationPrincipal UserDetails userDetails) {
        String effectiveKey = resolveGeminiKey(headerApiKey, userDetails);
        UserAiPreferencesRequest preferences = resolveUserPreferences(request.getPreferences(), userDetails);
        AiSchemaGenerationResponse response = geminiService.generateRichSchemaJsonLd(
                request.getAudit(),
                effectiveKey,
                request.getSchemaType(),
                preferences
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/chat")
    public ResponseEntity<AiChatResponse> chatWithAssistant(
            @RequestBody AiChatRequest request,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey,
            @AuthenticationPrincipal UserDetails userDetails) {
        String effectiveKey = resolveGeminiKey(headerApiKey, userDetails);
        UserAiPreferencesRequest preferences = resolveUserPreferences(request.getPreferences(), userDetails);
        AiChatResponse response = geminiService.chatWithAiAssistant(
                request.getAudit(),
                request.getConversationHistory(),
                request.getUserMessage(),
                effectiveKey,
                preferences
        );
        return ResponseEntity.ok(response);
    }

    private UserAiPreferencesRequest resolveUserPreferences(UserAiPreferencesRequest passed, UserDetails userDetails) {
        if (passed != null) {
            return passed;
        }
        if (userDetails != null) {
            Optional<UserEntity> userOpt = userRepository.findByUsername(userDetails.getUsername());
            if (userOpt.isPresent()) {
                UserEntity u = userOpt.get();
                return UserAiPreferencesRequest.builder()
                        .targetNiche(u.getTargetNiche())
                        .brandTone(u.getBrandTone())
                        .targetCountry(u.getTargetCountry())
                        .primaryObjective(u.getPrimaryObjective())
                        .aiCreativityLevel(u.getAiCreativityLevel())
                        .preferredAiModel(u.getPreferredAiModel())
                        .build();
            }
        }
        return null;
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

    @GetMapping("/models")
    public ResponseEntity<GeminiModelsResponse> getAvailableModels(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestHeader(value = "X-Gemini-Api-Key", required = false) String headerApiKey) {
        String geminiKey = resolveGeminiKey(headerApiKey, userDetails);
        if (geminiKey == null || geminiKey.isBlank()) {
            return ResponseEntity.ok(GeminiModelsResponse.builder()
                    .success(false)
                    .activeModel(geminiService.resolveActiveModel())
                    .models(List.of())
                    .error("No Gemini API key configured.")
                    .build());
        }

        List<GeminiModelDto> models = geminiService.fetchAvailableModelsDetailed(geminiKey);
        String activeModel = geminiService.resolveOptimalModel(models.stream().map(GeminiModelDto::getId).toList());
        return ResponseEntity.ok(GeminiModelsResponse.builder()
                .success(true)
                .activeModel(activeModel)
                .models(models)
                .build());
    }

    @PostMapping("/models/discover")
    public ResponseEntity<GeminiModelsResponse> discoverModelsWithKey(@RequestBody Map<String, String> request) {
        String apiKey = request != null ? request.get("apiKey") : null;
        if (apiKey == null || apiKey.trim().isBlank()) {
            return ResponseEntity.badRequest().body(GeminiModelsResponse.builder()
                    .success(false)
                    .error("Gemini API key is required.")
                    .build());
        }

        List<GeminiModelDto> models = geminiService.fetchAvailableModelsDetailed(apiKey);
        if (models.isEmpty()) {
            return ResponseEntity.ok(GeminiModelsResponse.builder()
                    .success(false)
                    .error("No generateContent models found for this Gemini API key.")
                    .build());
        }

        String activeModel = geminiService.resolveOptimalModel(models.stream().map(GeminiModelDto::getId).toList());
        return ResponseEntity.ok(GeminiModelsResponse.builder()
                .success(true)
                .activeModel(activeModel)
                .models(models)
                .build());
    }
}


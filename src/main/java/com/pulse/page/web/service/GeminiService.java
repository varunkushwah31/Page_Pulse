package com.pulse.page.web.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.page.web.config.AppProperties;
import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.GeminiCustomPromptResponse;
import com.pulse.page.web.dto.GeminiValidationResponse;
import com.pulse.page.web.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.*;

@Service
@Slf4j
public class GeminiService {

    private static final String GEMINI_API_BASE = "https://generativelanguage.googleapis.com";
    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final AppProperties appProperties;

    public GeminiService(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl(GEMINI_API_BASE)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    private String sanitizeApiKey(String apiKey) {
        if (apiKey == null) return "";
        return apiKey.trim()
                .replaceAll("^[\"']+", "")
                .replaceAll("[\"']+$", "")
                .trim();
    }

    public String resolveActiveModel() {
        if (appProperties.getGemini() != null && appProperties.getGemini().getModel() != null && !appProperties.getGemini().getModel().isBlank()) {
            return appProperties.getGemini().getModel().trim();
        }
        return "gemini-2.0-flash";
    }

    public List<String> fetchAvailableModels(String apiKey) {
        String key = sanitizeApiKey(apiKey);
        if (key.isEmpty()) {
            return Collections.emptyList();
        }

        try {
            String rawJson = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1beta/models")
                            .queryParam("key", key)
                            .build())
                    .retrieve()
                    .body(String.class);

            if (rawJson != null && !rawJson.isBlank()) {
                JsonNode response = objectMapper.readTree(rawJson);
                if (response != null && response.has("models")) {
                    List<String> validModels = new ArrayList<>();
                    for (JsonNode m : response.path("models")) {
                        boolean supportsGenerate = false;
                        if (m.has("supportedGenerationMethods")) {
                            for (JsonNode method : m.path("supportedGenerationMethods")) {
                                if ("generateContent".equalsIgnoreCase(method.asText())) {
                                    supportsGenerate = true;
                                    break;
                                }
                            }
                        }
                        if (supportsGenerate && m.has("name")) {
                            String name = m.path("name").asText();
                            if (name.startsWith("models/")) {
                                name = name.substring("models/".length());
                            }
                            validModels.add(name);
                        }
                    }
                    log.info("Discovered {} active generateContent models from Google AI Studio for key: {}", validModels.size(), validModels);
                    return validModels;
                }
            }
        } catch (Exception e) {
            String errorMsg = extractErrorMessage(e);
            log.warn("Failed to fetch model list from Google Gemini endpoint: {}", errorMsg);
            throw new RuntimeException(errorMsg, e);
        }

        return Collections.emptyList();
    }

    public String resolveOptimalModel(List<String> availableModels) {
        String requested = resolveActiveModel();
        if (availableModels == null || availableModels.isEmpty()) {
            return requested;
        }

        // 1. Exact match if requested model is supported
        if (availableModels.contains(requested)) {
            return requested;
        }

        // 2. High priority fast & accurate models
        String[] preferredOrder = {
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-2.0-flash-exp",
                "gemini-1.5-flash",
                "gemini-1.5-flash-latest",
                "gemini-1.5-flash-8b",
                "gemini-2.0-pro-exp",
                "gemini-1.5-pro",
                "gemini-1.5-pro-latest",
                "gemini-pro"
        };

        for (String candidate : preferredOrder) {
            if (availableModels.contains(candidate)) {
                return candidate;
            }
        }

        // 3. Fallback to any available model containing 'flash' or 'gemini'
        for (String m : availableModels) {
            if (m.contains("flash")) return m;
        }
        for (String m : availableModels) {
            if (m.contains("gemini")) return m;
        }

        return availableModels.get(0);
    }

    public List<String> getPrioritizedCandidateModels(String apiKey) {
        Set<String> prioritized = new LinkedHashSet<>();
        try {
            List<String> available = fetchAvailableModels(apiKey);
            if (!available.isEmpty()) {
                String optimal = resolveOptimalModel(available);
                prioritized.add(optimal);
                prioritized.addAll(available);
            }
        } catch (Exception ignored) {
        }

        // Static fallbacks in case network failed
        prioritized.add(resolveActiveModel());
        prioritized.add("gemini-2.0-flash");
        prioritized.add("gemini-1.5-flash");
        prioritized.add("gemini-1.5-flash-8b");
        prioritized.add("gemini-1.5-pro");
        prioritized.add("gemini-pro");

        return new ArrayList<>(prioritized);
    }

    public GeminiValidationResponse validateApiKey(String apiKey) {
        String keyToTest = sanitizeApiKey(apiKey);
        if (keyToTest.isEmpty()) {
            return GeminiValidationResponse.builder()
                    .valid(false)
                    .message("Gemini API key cannot be empty.")
                    .build();
        }

        try {
            List<String> availableModels = fetchAvailableModels(keyToTest);
            if (!availableModels.isEmpty()) {
                String bestModel = resolveOptimalModel(availableModels);
                return GeminiValidationResponse.builder()
                        .valid(true)
                        .message("Gemini API Key verified successfully with Google Gemini (" + bestModel + ")! Access granted to " + availableModels.size() + " models.")
                        .model(bestModel)
                        .build();
            } else {
                return GeminiValidationResponse.builder()
                        .valid(false)
                        .message("Google verified your key, but no generateContent models are currently assigned to it.")
                        .model(null)
                        .build();
            }
        } catch (Exception e) {
            String errorMsg = extractErrorMessage(e);
            log.warn("Gemini API key validation failed: {}", errorMsg);
            return GeminiValidationResponse.builder()
                    .valid(false)
                    .message(errorMsg)
                    .model(null)
                    .build();
        }
    }

    public List<AiRecommendationDto> generateSeoRecommendations(AuditResponse audit, String apiKey) {
        String key = sanitizeApiKey(apiKey);
        if (key.isEmpty()) {
            log.debug("No Gemini API key available for AI recommendation generation");
            return null;
        }

        String prompt = buildPromptFromAudit(audit);
        List<String> candidateModels = getPrioritizedCandidateModels(key);

        for (String model : candidateModels) {
            try {
                Map<String, Object> requestPayload = Map.of(
                        "contents", List.of(
                                Map.of("parts", List.of(
                                        Map.of("text", prompt)
                                ))
                        ),
                        "generationConfig", Map.of(
                                "temperature", 0.2,
                                "responseMimeType", "application/json"
                        )
                );

                String rawResponse = restClient.post()
                        .uri(uriBuilder -> uriBuilder
                                .path("/v1beta/models/" + model + ":generateContent")
                                .queryParam("key", key)
                                .build())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestPayload)
                        .retrieve()
                        .body(String.class);

                if (rawResponse == null || rawResponse.isBlank()) {
                    continue;
                }

                JsonNode response = objectMapper.readTree(rawResponse);
                if (response == null) {
                    continue;
                }

                JsonNode candidates = response.path("candidates");
                if (candidates.isEmpty()) {
                    continue;
                }

                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isEmpty()) {
                    continue;
                }

                String jsonText = parts.get(0).path("text").asText();
                if (jsonText == null || jsonText.isBlank()) {
                    continue;
                }

                jsonText = cleanJsonText(jsonText);

                List<AiRecommendationDto> recommendations = objectMapper.readValue(
                        jsonText,
                        new TypeReference<List<AiRecommendationDto>>() {}
                );

                if (recommendations != null && !recommendations.isEmpty()) {
                    for (AiRecommendationDto dto : recommendations) {
                        dto.setEngineSource("GEMINI_AI");
                        dto.setModel(model);
                    }
                    log.info("Successfully generated {} custom SEO recommendations using Google Gemini model {}",
                            recommendations.size(), model);
                    return recommendations;
                }

            } catch (Exception e) {
                log.warn("Gemini generation attempt with model {} failed: {}", model, extractErrorMessage(e));
            }
        }

        return null;
    }

    public GeminiCustomPromptResponse askCustomSeoQuestion(AuditResponse audit, String userPrompt, String apiKey) {
        String key = sanitizeApiKey(apiKey);
        if (key.isEmpty()) {
            return GeminiCustomPromptResponse.builder()
                    .success(false)
                    .error("Gemini API key is required to ask SEO questions. Please configure your key in the header or Profile.")
                    .build();
        }

        String contextPrompt = buildCustomPromptContext(audit, userPrompt);
        List<String> candidateModels = getPrioritizedCandidateModels(key);
        String lastError = null;

        for (String model : candidateModels) {
            try {
                Map<String, Object> requestPayload = Map.of(
                        "contents", List.of(
                                Map.of("parts", List.of(
                                        Map.of("text", contextPrompt)
                                ))
                        ),
                        "generationConfig", Map.of(
                                "temperature", 0.4
                        )
                );

                String rawResponse = restClient.post()
                        .uri(uriBuilder -> uriBuilder
                                .path("/v1beta/models/" + model + ":generateContent")
                                .queryParam("key", key)
                                .build())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestPayload)
                        .retrieve()
                        .body(String.class);

                if (rawResponse != null && !rawResponse.isBlank()) {
                    JsonNode response = objectMapper.readTree(rawResponse);
                    if (response != null && response.has("candidates") && !response.path("candidates").isEmpty()) {
                        String answer = response.path("candidates").get(0)
                                .path("content").path("parts").get(0)
                                .path("text").asText();

                        return GeminiCustomPromptResponse.builder()
                                .success(true)
                                .model(model)
                                .response(answer)
                                .build();
                    }
                }
            } catch (Exception e) {
                lastError = extractErrorMessage(e);
                log.warn("Gemini custom prompt attempt with model {} failed: {}", model, lastError);
            }
        }

        return GeminiCustomPromptResponse.builder()
                .success(false)
                .error(lastError != null ? lastError : "Failed to generate response from Gemini API.")
                .model(candidateModels.isEmpty() ? "gemini-2.0-flash" : candidateModels.get(0))
                .build();
    }

    private String extractErrorMessage(Exception e) {
        if (e instanceof org.springframework.web.client.RestClientResponseException rre) {
            String body = rre.getResponseBodyAsString();
            if (body != null && !body.isBlank()) {
                try {
                    JsonNode node = objectMapper.readTree(body);
                    if (node.has("error") && node.path("error").has("message")) {
                        return node.path("error").path("message").asText();
                    }
                } catch (Exception ignored) {
                }
                return "Google API error (" + rre.getStatusCode() + "): " + body;
            }
            return "Google API error (" + rre.getStatusCode() + ")";
        }
        return e.getMessage() != null ? e.getMessage() : "Unknown error";
    }

    private String cleanJsonText(String raw) {
        String trimmed = raw.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private String buildPromptFromAudit(AuditResponse audit) {
        SeoMetrics seo = audit.getSeoMetrics();
        ContentMetrics content = audit.getContentMetrics();
        AccessibilityMetrics a11y = audit.getAccessibilityMetrics();
        PerformanceMetrics perf = audit.getPerformanceMetrics();
        AuditScoreBreakdown scores = audit.getScores();

        StringBuilder sb = new StringBuilder();
        sb.append("You are an elite Google SEO, Technical SEO, and Web Quality Specialist.\n");
        sb.append("Analyze the following real-time technical audit findings for the webpage and generate a comprehensive array of actionable code fixes and strategic SEO improvements.\n\n");

        sb.append("=== AUDIT OVERVIEW ===\n");
        sb.append("URL: ").append(audit.getUrl()).append("\n");
        sb.append("Domain: ").append(audit.getDomain()).append("\n");
        sb.append("HTTP Status: ").append(audit.getHttpStatus()).append("\n");
        sb.append("Response Time: ").append(audit.getResponseTimeMs()).append(" ms\n");
        if (scores != null) {
            sb.append("Scores -> Overall: ").append(scores.getOverallScore())
                    .append(", SEO: ").append(scores.getSeoScore())
                    .append(", Content: ").append(scores.getContentScore())
                    .append(", Accessibility: ").append(scores.getAccessibilityScore())
                    .append(", Performance: ").append(scores.getPerformanceScore())
                    .append(", Health Grade: ").append(scores.getHealthGrade()).append("\n");
        }

        sb.append("\n=== TECHNICAL SEO METRICS ===\n");
        if (seo != null) {
            sb.append("Page Title: ").append(seo.getPageTitle()).append(" (Length: ").append(seo.getTitleLength()).append(" chars)\n");
            sb.append("Meta Description: ").append(seo.getMetaDescription()).append(" (Length: ").append(seo.getDescriptionLength()).append(" chars)\n");
            sb.append("Canonical URL: ").append(seo.getCanonicalUrl()).append(" (Status: ").append(seo.getCanonicalStatus()).append(")\n");
            sb.append("OpenGraph Complete: ").append(seo.isOpenGraphComplete()).append("\n");
            sb.append("Viewport Meta: ").append(seo.isHasViewportMeta()).append("\n");
            sb.append("Structured Data Present: ").append(seo.isHasStructuredData()).append("\n");
            if (seo.getStructuredDataInfo() != null) {
                sb.append("Structured Data Valid JSON-LD: ").append(seo.getStructuredDataInfo().isValidJsonLd()).append("\n");
                sb.append("Detected Schema Types: ").append(seo.getStructuredDataInfo().getDetectedSchemaTypes()).append("\n");
            }
        }

        sb.append("\n=== CONTENT & EDITORIAL METRICS ===\n");
        if (content != null) {
            sb.append("Word Count: ").append(content.getWordCount()).append(" (Thin Content: ").append(content.isThinContent()).append(")\n");
            sb.append("Heading Counts: ").append(content.getHeadingCounts()).append("\n");
            sb.append("Heading Issues: ").append(content.getHeadingIssues()).append("\n");
            if (content.getReadabilityMetrics() != null) {
                sb.append("Reading Ease Level: ").append(content.getReadabilityMetrics().getReadingEaseLevel()).append("\n");
            }
            if (content.getTopKeywords() != null && !content.getTopKeywords().isEmpty()) {
                sb.append("Top Keywords: ");
                for (var kw : content.getTopKeywords()) {
                    sb.append(kw.getPhrase()).append(" (").append(kw.getCount()).append("x, ").append(kw.getDensityPercentage()).append("%), ");
                }
                sb.append("\n");
            }
        }

        sb.append("\n=== ACCESSIBILITY & PERFORMANCE ===\n");
        if (a11y != null) {
            sb.append("Missing Image Alt Count: ").append(a11y.getImagesMissingAltCount()).append("\n");
            sb.append("HTML Lang: ").append(a11y.getHtmlLangValue()).append(" (Valid: ").append(a11y.isValidLangCode()).append(")\n");
            sb.append("Missing Form Labels: ").append(a11y.getFormInputsMissingLabelsCount()).append("\n");
            sb.append("Missing Button Names: ").append(a11y.getButtonsMissingAccessibleNameCount()).append("\n");
        }
        if (perf != null) {
            sb.append("Render Blocking Scripts in Head: ").append(perf.getRenderBlockingHeadScriptsCount()).append("\n");
            sb.append("Compression: ").append(perf.getContentEncoding()).append("\n");
        }

        sb.append("\n=== OUTPUT INSTRUCTIONS ===\n");
        sb.append("Generate a valid JSON array of objects with the exact schema:\n");
        sb.append("[\n");
        sb.append("  {\n");
        sb.append("    \"category\": \"SEO\" | \"ACCESSIBILITY\" | \"CONTENT\" | \"PERFORMANCE\" | \"SECURITY\",\n");
        sb.append("    \"priority\": \"P0_CRITICAL\" | \"P1_MAJOR\" | \"P2_MODERATE\" | \"P3_LOW\",\n");
        sb.append("    \"issue\": \"Precise description of the identified SEO/performance issue or opportunity\",\n");
        sb.append("    \"title\": \"Short, punchy, actionable action title\",\n");
        sb.append("    \"codeSnippet\": \"Exact copyable HTML / Meta tag / JSON-LD / code snippet specifically customized for this website\",\n");
        sb.append("    \"diffSnippet\": \"Unified diff showing '-' lines to remove and '+' lines to add\",\n");
        sb.append("    \"targetElementSelector\": \"DOM CSS selector (e.g. head, head > title, main, img:not([alt]))\",\n");
        sb.append("    \"explanation\": \"Clear rationale explaining how this fix boosts search ranking, CTR, Core Web Vitals, or UX\",\n");
        sb.append("    \"impactLevel\": \"HIGH\" | \"MEDIUM\" | \"LOW\",\n");
        sb.append("    \"estimatedScoreImprovement\": \"+X to +Y pts\",\n");
        sb.append("    \"guidelineReference\": \"Standard or reference (e.g. Google Search Central, Schema.org, WCAG 2.1 SC 1.1.1)\"\n");
        sb.append("  }\n");
        sb.append("]\n");
        sb.append("Make sure to generate customized title/meta descriptions/JSON-LD schemas specifically for ").append(audit.getDomain()).append(". Include 5 to 10 prioritized recommendations.");

        return sb.toString();
    }

    private String buildCustomPromptContext(AuditResponse audit, String userPrompt) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an expert AI SEO Consultant and Search Engine Optimizer.\n");
        sb.append("Website Under Audit: ").append(audit.getUrl()).append(" (Domain: ").append(audit.getDomain()).append(")\n");
        if (audit.getSeoMetrics() != null) {
            sb.append("Current Page Title: ").append(audit.getSeoMetrics().getPageTitle()).append("\n");
            sb.append("Current Meta Description: ").append(audit.getSeoMetrics().getMetaDescription()).append("\n");
        }
        if (audit.getScores() != null) {
            sb.append("Overall Score: ").append(audit.getScores().getOverallScore()).append("/100\n");
            sb.append("SEO Score: ").append(audit.getScores().getSeoScore()).append("/100\n");
        }
        if (audit.getContentMetrics() != null) {
            sb.append("Word Count: ").append(audit.getContentMetrics().getWordCount()).append("\n");
            sb.append("Headings: ").append(audit.getContentMetrics().getHeadingCounts()).append("\n");
        }

        sb.append("\nUser Request: ").append(userPrompt).append("\n\n");
        sb.append("Provide a clear, detailed, and directly actionable response with formatted code snippets, HTML tags, or concrete SEO recommendations where applicable.");

        return sb.toString();
    }
}

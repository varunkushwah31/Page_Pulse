package com.pulse.page.web.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.page.web.config.AppProperties;
import com.pulse.page.web.dto.*;
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
    private static final String MODEL_GEMINI_2_0_FLASH = "gemini-2.0-flash";
    private static final String MODEL_GEMINI_2_5_FLASH = "gemini-2.5-flash";
    private static final String MODEL_GEMINI_1_5_FLASH = "gemini-1.5-flash";
    private static final String MODEL_GEMINI_1_5_PRO = "gemini-1.5-pro";
    private static final String MODEL_GEMINI_PRO = "gemini-pro";

    private static final String PATH_V1BETA_MODELS = "/v1beta/models/";
    private static final String GENERATE_CONTENT_SUFFIX = ":generateContent";
    private static final String JSON_CONTENTS = "contents";
    private static final String JSON_CONTENT = "content";
    private static final String JSON_PARTS = "parts";
    private static final String JSON_TEXT = "text";
    private static final String JSON_GENERATION_CONFIG = "generationConfig";
    private static final String JSON_TEMPERATURE = "temperature";
    private static final String JSON_RESPONSE_MIME_TYPE = "responseMimeType";
    private static final String JSON_APP_JSON = "application/json";
    private static final String JSON_CANDIDATES = "candidates";
    private static final String JSON_MODELS = "models";
    private static final String JSON_MODEL = "model";
    private static final String JSON_ERROR = "error";
    private static final String JSON_SUPPORTED_GEN_METHODS = "supportedGenerationMethods";
    private static final String METHOD_GENERATE_CONTENT = "generateContent";
    private static final String PREFIX_MODELS = "models/";

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
        String trimmed = apiKey.trim();
        while (trimmed.startsWith("\"") || trimmed.startsWith("'")) {
            trimmed = trimmed.substring(1);
        }
        while (trimmed.endsWith("\"") || trimmed.endsWith("'")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed.trim();
    }

    public String resolveActiveModel() {
        if (appProperties.getGemini() != null && appProperties.getGemini().getModel() != null && !appProperties.getGemini().getModel().isBlank()) {
            return appProperties.getGemini().getModel().trim();
        }
        return MODEL_GEMINI_2_0_FLASH;
    }

    private boolean isGenerateContentSupported(JsonNode modelNode) {
        if (modelNode == null || !modelNode.has(JSON_SUPPORTED_GEN_METHODS)) {
            return false;
        }
        for (JsonNode method : modelNode.path(JSON_SUPPORTED_GEN_METHODS)) {
            if (METHOD_GENERATE_CONTENT.equalsIgnoreCase(method.asText())) {
                return true;
            }
        }
        return false;
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
                if (response != null && response.has(JSON_MODELS)) {
                    List<String> validModels = new ArrayList<>();
                    for (JsonNode m : response.path(JSON_MODELS)) {
                        if (isGenerateContentSupported(m) && m.has("name")) {
                            String name = m.path("name").asText();
                            if (name.startsWith(PREFIX_MODELS)) {
                                name = name.substring(PREFIX_MODELS.length());
                            }
                            validModels.add(name);
                        }
                    }
                    log.info("Discovered {} active generateContent models from Google AI Studio", validModels.size());
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

        if (availableModels.contains(requested)) {
            return requested;
        }

        String[] preferredOrder = {
                MODEL_GEMINI_2_5_FLASH,
                MODEL_GEMINI_2_0_FLASH,
                "gemini-2.0-flash-exp",
                MODEL_GEMINI_1_5_FLASH,
                "gemini-1.5-flash-latest",
                "gemini-1.5-flash-8b",
                "gemini-2.0-pro-exp",
                MODEL_GEMINI_1_5_PRO,
                "gemini-1.5-pro-latest",
                MODEL_GEMINI_PRO
        };

        for (String candidate : preferredOrder) {
            if (availableModels.contains(candidate)) {
                return candidate;
            }
        }

        for (String m : availableModels) {
            if (m.contains("flash")) return m;
        }
        for (String m : availableModels) {
            if (m.contains("gemini")) return m;
        }

        return availableModels.getFirst();
    }

    public List<GeminiModelDto> fetchAvailableModelsDetailed(String apiKey) {
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
                if (response != null && response.has(JSON_MODELS)) {
                    List<GeminiModelDto> detailedModels = new ArrayList<>();
                    for (JsonNode m : response.path(JSON_MODELS)) {
                        if (isGenerateContentSupported(m) && m.has("name")) {
                            String rawName = m.path("name").asText();
                            String id = rawName.startsWith(PREFIX_MODELS) ? rawName.substring(PREFIX_MODELS.length()) : rawName;
                            String displayName = m.path("displayName").asText(id);
                            String description = m.path("description").asText("");
                            int inputTokens = m.path("inputTokenLimit").asInt(0);
                            int outputTokens = m.path("outputTokenLimit").asInt(0);
                            boolean isRecommended = id.equals(MODEL_GEMINI_2_0_FLASH) || id.equals(MODEL_GEMINI_2_5_FLASH);

                            detailedModels.add(GeminiModelDto.builder()
                                    .id(id)
                                    .name(rawName)
                                    .displayName(displayName)
                                    .description(description)
                                    .inputTokenLimit(inputTokens)
                                    .outputTokenLimit(outputTokens)
                                    .supportsGenerateContent(true)
                                    .isRecommended(isRecommended)
                                    .build());
                        }
                    }

                    detailedModels.sort((a, b) -> {
                        if (a.isRecommended() && !b.isRecommended()) return -1;
                        if (!a.isRecommended() && b.isRecommended()) return 1;
                        return a.getId().compareToIgnoreCase(b.getId());
                    });

                    log.info("Discovered {} detailed generateContent models from Google Gemini API", detailedModels.size());
                    return detailedModels;
                }
            }
        } catch (Exception e) {
            String errorMsg = extractErrorMessage(e);
            log.warn("Failed to fetch detailed model list from Google Gemini endpoint: {}", errorMsg);
        }

        return Collections.emptyList();
    }

    public List<String> getPrioritizedCandidateModels(String apiKey) {
        return getPrioritizedCandidateModels(apiKey, null);
    }

    public List<String> getPrioritizedCandidateModels(String apiKey, String preferredModel) {
        Set<String> prioritized = new LinkedHashSet<>();

        if (preferredModel != null && !preferredModel.trim().isBlank()) {
            prioritized.add(preferredModel.trim());
        }

        try {
            List<String> available = fetchAvailableModels(apiKey);
            if (!available.isEmpty()) {
                String optimal = resolveOptimalModel(available);
                prioritized.add(optimal);
                prioritized.addAll(available);
            }
        } catch (Exception e) {
            log.debug("Candidate model discovery fallback: {}", e.getMessage());
        }

        prioritized.add(resolveActiveModel());
        prioritized.add(MODEL_GEMINI_2_0_FLASH);
        prioritized.add(MODEL_GEMINI_2_5_FLASH);
        prioritized.add(MODEL_GEMINI_1_5_FLASH);
        prioritized.add("gemini-1.5-flash-8b");
        prioritized.add(MODEL_GEMINI_1_5_PRO);
        prioritized.add(MODEL_GEMINI_PRO);

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
            List<GeminiModelDto> detailedModels = fetchAvailableModelsDetailed(keyToTest);
            if (!detailedModels.isEmpty()) {
                List<String> modelNames = detailedModels.stream().map(GeminiModelDto::getId).toList();
                String bestModel = resolveOptimalModel(modelNames);
                return GeminiValidationResponse.builder()
                        .valid(true)
                        .message("Gemini API Key verified successfully with Google Gemini (" + bestModel + ")! Access granted to " + detailedModels.size() + " models.")
                        .model(bestModel)
                        .availableModels(detailedModels)
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

    private String executeGenerateContent(String model, String key, String prompt, double temperature, boolean jsonMode) {
        Map<String, Object> generationConfig = jsonMode
                ? Map.of(JSON_TEMPERATURE, temperature, JSON_RESPONSE_MIME_TYPE, JSON_APP_JSON)
                : Map.of(JSON_TEMPERATURE, temperature);

        Map<String, Object> requestPayload = Map.of(
                JSON_CONTENTS, List.of(
                        Map.of(JSON_PARTS, List.of(Map.of(JSON_TEXT, prompt)))
                ),
                JSON_GENERATION_CONFIG, generationConfig
        );

        return restClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path(PATH_V1BETA_MODELS + model + GENERATE_CONTENT_SUFFIX)
                        .queryParam("key", key)
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestPayload)
                .retrieve()
                .body(String.class);
    }

    private String extractCandidateText(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            return null;
        }
        try {
            JsonNode response = objectMapper.readTree(rawResponse);
            if (response == null) return null;
            JsonNode candidates = response.path(JSON_CANDIDATES);
            if (candidates.isEmpty()) return null;
            JsonNode parts = candidates.get(0).path(JSON_CONTENT).path(JSON_PARTS);
            if (parts.isEmpty()) return null;
            String text = parts.get(0).path(JSON_TEXT).asText(null);
            return text != null && !text.isBlank() ? cleanJsonText(text) : null;
        } catch (Exception e) {
            log.debug("Failed to extract candidate text: {}", e.getMessage());
            return null;
        }
    }

    public List<AiRecommendationDto> generateSeoRecommendations(AuditResponse audit, String apiKey) {
        return generateSeoRecommendations(audit, apiKey, null);
    }

    public List<AiRecommendationDto> generateSeoRecommendations(AuditResponse audit, String apiKey, UserAiPreferencesRequest preferences) {
        String key = sanitizeApiKey(apiKey);
        if (key.isEmpty()) {
            log.debug("No Gemini API key available for AI recommendation generation");
            return Collections.emptyList();
        }

        String prompt = buildPromptFromAudit(audit, preferences);
        String preferredModel = preferences != null ? preferences.getPreferredAiModel() : null;
        List<String> candidateModels = getPrioritizedCandidateModels(key, preferredModel);
        double temp = resolveTemperature(preferences, 0.2);

        for (String model : candidateModels) {
            try {
                String raw = executeGenerateContent(model, key, prompt, temp, true);
                String jsonText = extractCandidateText(raw);
                if (jsonText != null) {
                    List<AiRecommendationDto> recommendations = objectMapper.readValue(
                            jsonText,
                            new TypeReference<>() {
                            }
                    );

                    if (recommendations != null && !recommendations.isEmpty()) {
                        for (AiRecommendationDto dto : recommendations) {
                            dto.setEngineSource("GEMINI_AI");
                            dto.setModel(model);
                        }
                        log.info("Successfully generated {} custom SEO recommendations using Gemini model {}",
                                recommendations.size(), model);
                        return recommendations;
                    }
                }
            } catch (Exception e) {
                log.warn("Gemini recommendation attempt with model {} failed: {}", model, extractErrorMessage(e));
            }
        }

        return Collections.emptyList();
    }

    public AiTitleVariationsDto generateTitleAndMetaVariations(AuditResponse audit, String apiKey, UserAiPreferencesRequest preferences) {
        String key = sanitizeApiKey(apiKey);
        if (key.isEmpty()) {
            return AiTitleVariationsDto.builder()
                    .success(false)
                    .error("Gemini API key is required to generate Title & Meta variations.")
                    .build();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("You are an elite Search Engine Copywriter, CTR Optimization Expert, and Conversion Rate Specialist.\n");
        sb.append("Generate 3 distinct, high-converting A/B variations for the HTML <title> tag and <meta name=\"description\"> for the following webpage.\n\n");
        appendPersonalizationContext(sb, preferences);
        sb.append("Current Page Title: ").append(audit.getSeoMetrics() != null ? audit.getSeoMetrics().getPageTitle() : "").append("\n");
        sb.append("Current Meta Description: ").append(audit.getSeoMetrics() != null ? audit.getSeoMetrics().getMetaDescription() : "").append("\n");
        sb.append("Target Domain: ").append(audit.getDomain()).append("\n");
        sb.append("Target URL: ").append(audit.getUrl()).append("\n\n");
        sb.append("Output a valid JSON array of 3 objects with schema:\n");
        sb.append("[\n");
        sb.append("  {\n");
        sb.append("    \"angle\": \"CTR Maximizer\" | \"Brand Authority & Trust\" | \"Search Intent & Benefit-Focused\",\n");
        sb.append("    \"title\": \"Compelling title under 60 characters\",\n");
        sb.append("    \"titleLength\": 55,\n");
        sb.append("    \"metaDescription\": \"High-CTR meta description between 130 and 155 characters with call to action\",\n");
        sb.append("    \"descriptionLength\": 148,\n");
        sb.append("    \"rationale\": \"Why this angle improves CTR and rankings for this business niche\",\n");
        sb.append("    \"estimatedCtrLift\": \"+15% to +28% CTR\"\n");
        sb.append("  }\n");
        sb.append("]");

        String preferredModel = preferences != null ? preferences.getPreferredAiModel() : null;
        List<String> candidateModels = getPrioritizedCandidateModels(key, preferredModel);
        double temp = resolveTemperature(preferences, 0.4);

        for (String model : candidateModels) {
            try {
                String raw = executeGenerateContent(model, key, sb.toString(), temp, true);
                String jsonText = extractCandidateText(raw);
                if (jsonText != null) {
                    List<AiTitleVariationsDto.TitleMetaOption> list = objectMapper.readValue(
                            jsonText,
                            new TypeReference<List<AiTitleVariationsDto.TitleMetaOption>>() {}
                    );
                    return AiTitleVariationsDto.builder()
                            .success(true)
                            .model(model)
                            .variations(list)
                            .build();
                }
            } catch (Exception e) {
                log.warn("Title variations generation failed with model {}: {}", model, extractErrorMessage(e));
            }
        }

        return AiTitleVariationsDto.builder()
                .success(false)
                .error("Failed to generate Title/Meta variations via Gemini.")
                .build();
    }

    public AiExecutiveSummaryDto generateExecutiveSummary(AuditResponse audit, String apiKey, UserAiPreferencesRequest preferences) {
        String key = sanitizeApiKey(apiKey);
        if (key.isEmpty()) {
            return AiExecutiveSummaryDto.builder()
                    .success(false)
                    .error("Gemini API key is required to generate Executive Summary.")
                    .build();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("You are a Chief SEO Strategist and Executive Search Consultant.\n");
        sb.append("Generate an authoritative, executive-level strategic summary of this website audit for leadership and engineering teams.\n\n");
        appendPersonalizationContext(sb, preferences);
        sb.append(buildPromptFromAudit(audit, preferences));
        sb.append("\nOutput a valid JSON object with schema:\n");
        sb.append("{\n");
        sb.append("  \"overallHealthStatus\": \"EXCELLENT\" | \"HEALTHY\" | \"NEEDS_ATTENTION\" | \"CRITICAL\",\n");
        sb.append("  \"executiveHeadline\": \"One punchy, authoritative summary sentence of current search readiness\",\n");
        sb.append("  \"topStrengths\": [\"Strength 1\", \"Strength 2\", \"Strength 3\"],\n");
        sb.append("  \"topQuickWins\": [\"Highest-ROI immediate quick win 1\", \"Quick win 2\", \"Quick win 3\"],\n");
        sb.append("  \"criticalRedFlags\": [\"Severe red flag hurting indexing or CTR 1\", \"Red flag 2\"],\n");
        sb.append("  \"competitorRankingAngle\": \"Strategic angle explaining how to outrank competitors in this specific niche\"\n");
        sb.append("}");

        String preferredModel = preferences != null ? preferences.getPreferredAiModel() : null;
        List<String> candidateModels = getPrioritizedCandidateModels(key, preferredModel);
        double temp = resolveTemperature(preferences, 0.3);

        for (String model : candidateModels) {
            try {
                String raw = executeGenerateContent(model, key, sb.toString(), temp, true);
                String jsonText = extractCandidateText(raw);
                if (jsonText != null) {
                    AiExecutiveSummaryDto dto = objectMapper.readValue(jsonText, AiExecutiveSummaryDto.class);
                    dto.setSuccess(true);
                    dto.setModel(model);
                    return dto;
                }
            } catch (Exception e) {
                log.warn("Executive summary generation failed with model {}: {}", model, extractErrorMessage(e));
            }
        }

        return AiExecutiveSummaryDto.builder()
                .success(false)
                .error("Failed to generate Executive Summary via Gemini.")
                .build();
    }

    public AiSchemaGenerationResponse generateRichSchemaJsonLd(AuditResponse audit, String apiKey, String schemaType, UserAiPreferencesRequest preferences) {
        String key = sanitizeApiKey(apiKey);
        if (key.isEmpty()) {
            return AiSchemaGenerationResponse.builder()
                    .success(false)
                    .error("Gemini API key is required to generate Schema.org JSON-LD.")
                    .build();
        }

        StringBuilder sb = new StringBuilder();
        sb.append("You are a Schema.org and Google Rich Snippet Structured Data Specialist.\n");
        sb.append("Generate a valid, fully populated Schema.org JSON-LD script for the audited page.\n\n");
        if (schemaType != null && !schemaType.isBlank() && !"AUTO".equalsIgnoreCase(schemaType)) {
            sb.append("Requested Schema Type: ").append(schemaType).append("\n");
        } else {
            sb.append("Requested Schema Type: Auto-detect the best Schema.org type based on business niche and DOM content.\n");
        }
        appendPersonalizationContext(sb, preferences);
        sb.append("Target URL: ").append(audit.getUrl()).append("\n");
        sb.append("Target Domain: ").append(audit.getDomain()).append("\n");
        if (audit.getSeoMetrics() != null) {
            sb.append("Title: ").append(audit.getSeoMetrics().getPageTitle()).append("\n");
            sb.append("Description: ").append(audit.getSeoMetrics().getMetaDescription()).append("\n");
        }
        sb.append("\nReturn a valid JSON object with schema:\n");
        sb.append("{\n");
        sb.append("  \"detectedType\": \"Organization\" | \"Product\" | \"SoftwareApplication\" | \"Article\" | \"FAQPage\" | \"LocalBusiness\" | \"WebSite\",\n");
        sb.append("  \"jsonLdScript\": \"<script type=\\\"application/ld+json\\\">\\n{\\n  \\\"@context\\\": \\\"https://schema.org\\\",\\n  ...\\n}\\n</script>\",\n");
        sb.append("  \"explanation\": \"Why this schema structure qualifies for Google rich snippets and badges\",\n");
        sb.append("  \"validationNotes\": \"Key properties included and Google Rich Results Test compatibility note\"\n");
        sb.append("}");

        String preferredModel = preferences != null ? preferences.getPreferredAiModel() : null;
        List<String> candidateModels = getPrioritizedCandidateModels(key, preferredModel);
        double temp = resolveTemperature(preferences, 0.1);

        for (String model : candidateModels) {
            try {
                String raw = executeGenerateContent(model, key, sb.toString(), temp, true);
                String jsonText = extractCandidateText(raw);
                if (jsonText != null) {
                    AiSchemaGenerationResponse dto = objectMapper.readValue(jsonText, AiSchemaGenerationResponse.class);
                    dto.setSuccess(true);
                    dto.setModel(model);
                    return dto;
                }
            } catch (Exception e) {
                log.warn("Schema generation failed with model {}: {}", model, extractErrorMessage(e));
            }
        }

        return AiSchemaGenerationResponse.builder()
                .success(false)
                .error("Failed to generate Schema.org JSON-LD structured data via Gemini.")
                .build();
    }

    public AiChatResponse chatWithAiAssistant(AuditResponse audit, List<AiChatRequest.ChatMessage> conversationHistory, String userMessage, String apiKey, UserAiPreferencesRequest preferences) {
        String key = sanitizeApiKey(apiKey);
        if (key.isEmpty()) {
            return AiChatResponse.builder()
                    .success(false)
                    .error("Gemini API key is required for interactive AI Chat.")
                    .build();
        }

        List<Map<String, Object>> contents = new ArrayList<>();

        StringBuilder systemContext = new StringBuilder();
        systemContext.append("You are Page Pulse AI, an elite SEO, Web Performance, and Accessibility Consultant.\n");
        systemContext.append("You are chatting live with a developer / webmaster about the technical audit for: ")
                .append(audit.getUrl()).append(" (Domain: ").append(audit.getDomain()).append(")\n\n");
        appendPersonalizationContext(systemContext, preferences);
        if (audit.getScores() != null) {
            systemContext.append("Audit Scores -> Overall: ").append(audit.getScores().getOverallScore())
                    .append(", SEO: ").append(audit.getScores().getSeoScore())
                    .append(", Content: ").append(audit.getScores().getContentScore())
                    .append(", Accessibility: ").append(audit.getScores().getAccessibilityScore())
                    .append(", Performance: ").append(audit.getScores().getPerformanceScore()).append("\n");
        }
        if (audit.getSeoMetrics() != null) {
            systemContext.append("Title: ").append(audit.getSeoMetrics().getPageTitle()).append("\n");
            systemContext.append("Meta Description: ").append(audit.getSeoMetrics().getMetaDescription()).append("\n");
        }
        systemContext.append("\nAnswer concisely, accurately, and provide formatted code snippets or concrete HTML/CSS/JSON-LD whenever helpful.");

        contents.add(Map.of(
                "role", "user",
                JSON_PARTS, List.of(Map.of(JSON_TEXT, systemContext.toString()))
        ));
        contents.add(Map.of(
                "role", "model",
                JSON_PARTS, List.of(Map.of(JSON_TEXT, "Understood. I am Page Pulse AI, your personalized SEO & Web Quality Advisor. How can I help you improve " + audit.getDomain() + "?"))
        ));

        if (conversationHistory != null) {
            for (AiChatRequest.ChatMessage msg : conversationHistory) {
                String role = "model".equalsIgnoreCase(msg.getRole()) || "assistant".equalsIgnoreCase(msg.getRole()) ? "model" : "user";
                if (msg.getText() != null && !msg.getText().isBlank()) {
                    contents.add(Map.of(
                            "role", role,
                            JSON_PARTS, List.of(Map.of(JSON_TEXT, msg.getText()))
                    ));
                }
            }
        }

        contents.add(Map.of(
                "role", "user",
                JSON_PARTS, List.of(Map.of(JSON_TEXT, userMessage))
        ));

        String preferredModel = preferences != null ? preferences.getPreferredAiModel() : null;
        List<String> candidateModels = getPrioritizedCandidateModels(key, preferredModel);
        double temp = resolveTemperature(preferences, 0.4);

        for (String model : candidateModels) {
            try {
                Map<String, Object> requestPayload = Map.of(
                        JSON_CONTENTS, contents,
                        JSON_GENERATION_CONFIG, Map.of(JSON_TEMPERATURE, temp)
                );

                String raw = restClient.post()
                        .uri(uriBuilder -> uriBuilder.path(PATH_V1BETA_MODELS + model + GENERATE_CONTENT_SUFFIX).queryParam("key", key).build())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestPayload)
                        .retrieve()
                        .body(String.class);

                if (raw != null && !raw.isBlank()) {
                    JsonNode node = objectMapper.readTree(raw);
                    String reply = node.path(JSON_CANDIDATES).get(0).path(JSON_CONTENT).path(JSON_PARTS).get(0).path(JSON_TEXT).asText();
                    return AiChatResponse.builder()
                            .success(true)
                            .model(model)
                            .reply(reply)
                            .build();
                }
            } catch (Exception e) {
                log.warn("AI Chat attempt failed with model {}: {}", model, extractErrorMessage(e));
            }
        }

        return AiChatResponse.builder()
                .success(false)
                .error("Failed to generate AI Chat response via Gemini.")
                .build();
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
                String rawResponse = executeGenerateContent(model, key, contextPrompt, 0.4, false);
                if (rawResponse != null && !rawResponse.isBlank()) {
                    JsonNode response = objectMapper.readTree(rawResponse);
                    if (response != null && response.has(JSON_CANDIDATES) && !response.path(JSON_CANDIDATES).isEmpty()) {
                        String answer = response.path(JSON_CANDIDATES).get(0)
                                .path(JSON_CONTENT).path(JSON_PARTS).get(0)
                                .path(JSON_TEXT).asText();

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
                .model(candidateModels.isEmpty() ? MODEL_GEMINI_2_0_FLASH : candidateModels.getFirst())
                .build();
    }

    private double resolveTemperature(UserAiPreferencesRequest preferences, double defaultTemp) {
        if (preferences == null || preferences.getAiCreativityLevel() == null) {
            return defaultTemp;
        }
        String level = preferences.getAiCreativityLevel().toUpperCase();
        if ("PRECISE".equals(level)) return 0.1;
        if ("CREATIVE".equals(level)) return 0.7;
        return defaultTemp;
    }

    private void appendPersonalizationContext(StringBuilder sb, UserAiPreferencesRequest preferences) {
        if (preferences == null) return;
        sb.append("\n=== USER BRAND & BUSINESS PERSONALIZATION PROFILE ===\n");
        if (preferences.getTargetNiche() != null && !preferences.getTargetNiche().isBlank()) {
            sb.append("Business Niche / Industry: ").append(preferences.getTargetNiche()).append("\n");
        }
        if (preferences.getBrandTone() != null && !preferences.getBrandTone().isBlank()) {
            sb.append("Brand Voice & Tone: ").append(preferences.getBrandTone()).append(" (Adhere strictly to this tone in titles, meta descriptions, and code explanations)\n");
        }
        if (preferences.getTargetCountry() != null && !preferences.getTargetCountry().isBlank()) {
            sb.append("Target Search Region / Market: ").append(preferences.getTargetCountry()).append("\n");
        }
        if (preferences.getPrimaryObjective() != null && !preferences.getPrimaryObjective().isBlank()) {
            sb.append("Primary Optimization Goal: ").append(preferences.getPrimaryObjective()).append("\n");
        }
        sb.append("\n");
    }

    private String extractErrorMessage(Exception e) {
        if (e instanceof org.springframework.web.client.RestClientResponseException rre) {
            String body = rre.getResponseBodyAsString();
            if (!body.isBlank()) {
                try {
                    JsonNode node = objectMapper.readTree(body);
                    if (node.has(JSON_ERROR) && node.path(JSON_ERROR).has("message")) {
                        return node.path(JSON_ERROR).path("message").asText();
                    }
                } catch (Exception parseEx) {
                    log.debug("Could not parse error body JSON: {}", parseEx.getMessage());
                }
                return "Google API error (" + rre.getStatusCode() + "): " + body;
            }
            return "Google API error (" + rre.getStatusCode() + ")";
        }
        return e.getMessage() != null ? e.getMessage() : "Unknown error";
    }

    private String cleanJsonText(String raw) {
        String trimmed = raw.trim();
        if (trimmed.startsWith("`json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("`")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("`")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    private String buildPromptFromAudit(AuditResponse audit, UserAiPreferencesRequest preferences) {
        SeoMetrics seo = audit.getSeoMetrics();
        ContentMetrics content = audit.getContentMetrics();
        AccessibilityMetrics a11y = audit.getAccessibilityMetrics();
        PerformanceMetrics perf = audit.getPerformanceMetrics();
        AuditScoreBreakdown scores = audit.getScores();

        StringBuilder sb = new StringBuilder();
        sb.append("You are an elite Google SEO, Technical SEO, and Web Quality Specialist.\n");
        sb.append("Analyze the following real-time technical audit findings for the webpage and generate a comprehensive array of actionable code fixes and strategic SEO improvements.\n\n");
        appendPersonalizationContext(sb, preferences);

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
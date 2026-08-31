package com.pulse.page.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.model.SeoMetrics;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.jpa.UserRepository;
import com.pulse.page.web.service.AiRecommendationService;
import com.pulse.page.web.service.AuditReportProcessorService;
import com.pulse.page.web.service.CacheService;
import com.pulse.page.web.service.GeminiService;
import org.jspecify.annotations.NonNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AiRecommendationControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AiRecommendationService recommendationService;

    @Mock
    private GeminiService geminiService;

    @Mock
    private AuditReportJpaRepository jpaRepository;

    @Mock
    private AuditReportProcessorService processorService;

    @Mock
    private CacheService cacheService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AiRecommendationController controller;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, false)
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @BeforeEach
    @SuppressWarnings({"removal"})
    void setUp() {
        org.springframework.http.converter.json.MappingJackson2HttpMessageConverter converter =
                new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(objectMapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setMessageConverters(converter)
                .setCustomArgumentResolvers(new org.springframework.web.method.support.HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(org.springframework.core.@NonNull MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(org.springframework.security.core.annotation.AuthenticationPrincipal.class);
                    }

                    @Override
                    public Object resolveArgument(org.springframework.core.@NonNull MethodParameter parameter,
                                                  org.springframework.web.method.support.ModelAndViewContainer mavContainer,
                                                  org.springframework.web.context.request.@NonNull NativeWebRequest webRequest,
                                                  org.springframework.web.bind.support.WebDataBinderFactory binderFactory) {
                        return null;
                    }
                })
                .build();
    }

    @Test
    void getAiFixRecommendations_postAuditResponse_returnsList() throws Exception {
        AiRecommendationDto rec = AiRecommendationDto.builder()
                .category("SEO")
                .priority("P0_CRITICAL")
                .title("Add Descriptive Page Title Tag")
                .codeSnippet("<title>Test</title>")
                .explanation("Title is needed")
                .impactLevel("HIGH")
                .build();

        when(recommendationService.generateRecommendations(any(AuditResponse.class)))
                .thenReturn(List.of(rec));

        AuditResponse audit = AuditResponse.builder()
                .id(1L)
                .url("https://github.com")
                .domain("github.com")
                .seoMetrics(SeoMetrics.builder().hasTitle(false).build())
                .build();

        mockMvc.perform(post("/api/v1/ai/recommendations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(audit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Add Descriptive Page Title Tag"))
                .andExpect(jsonPath("$[0].category").value("SEO"));
    }

    @Test
    void getAiFixRecommendationsById_existingId_returnsList() throws Exception {
        AuditReportEntity entity = AuditReportEntity.builder()
                .id(10L)
                .url("https://github.com")
                .domain("github.com")
                .pageTitle("GitHub")
                .build();

        AiRecommendationDto rec = AiRecommendationDto.builder()
                .category("SEO")
                .title("Optimize Title")
                .codeSnippet("<title>GitHub</title>")
                .build();

        when(jpaRepository.findById(10L)).thenReturn(Optional.of(entity));
        when(cacheService.getCachedAudit("https://github.com")).thenReturn(Optional.empty());
        when(recommendationService.generateRecommendations(any(AuditResponse.class))).thenReturn(List.of(rec));

        mockMvc.perform(get("/api/v1/ai/recommendations/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Optimize Title"));
    }

    @Test
    void getAiFixRecommendationsByParam_url_returnsList() throws Exception {
        AuditResponse audit = AuditResponse.builder()
                .id(1L)
                .url("https://github.com")
                .domain("github.com")
                .build();

        AiRecommendationDto rec = AiRecommendationDto.builder()
                .category("PERFORMANCE")
                .title("Add defer to scripts")
                .codeSnippet("<script defer></script>")
                .build();

        when(cacheService.getCachedAudit("https://github.com")).thenReturn(Optional.of(audit));
        when(recommendationService.generateRecommendations(any(AuditResponse.class))).thenReturn(List.of(rec));

        mockMvc.perform(get("/api/v1/ai/recommendations").param("url", "https://github.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].category").value("PERFORMANCE"));
    }

    @Test
    void generateTitleVariations_returnsAiTitleVariationsDto() throws Exception {
        AuditResponse audit = AuditResponse.builder()
                .id(1L)
                .url("https://github.com")
                .domain("github.com")
                .build();

        com.pulse.page.web.dto.AiTitleVariationsDto variations = com.pulse.page.web.dto.AiTitleVariationsDto.builder()
                .success(true)
                .model("gemini-2.0-flash")
                .variations(List.of(
                        com.pulse.page.web.dto.AiTitleVariationsDto.TitleMetaOption.builder()
                                .angle("CTR Maximizer")
                                .title("GitHub: Let's Build from Here")
                                .titleLength(29)
                                .metaDescription("Join millions of developers...")
                                .descriptionLength(32)
                                .estimatedCtrLift("+25%")
                                .build()
                ))
                .build();

        when(geminiService.generateTitleAndMetaVariations(any(AuditResponse.class), any(), any())).thenReturn(variations);

        mockMvc.perform(post("/api/v1/ai/title-variations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(audit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variations[0].angle").value("CTR Maximizer"));
    }

    @Test
    void generateExecutiveSummary_returnsAiExecutiveSummaryDto() throws Exception {
        AuditResponse audit = AuditResponse.builder()
                .id(1L)
                .url("https://github.com")
                .domain("github.com")
                .build();

        com.pulse.page.web.dto.AiExecutiveSummaryDto summary = com.pulse.page.web.dto.AiExecutiveSummaryDto.builder()
                .success(true)
                .overallHealthStatus("HEALTHY")
                .executiveHeadline("Strong developer portal with high authority.")
                .topQuickWins(List.of("Add schema JSON-LD", "Optimize image aspect ratios"))
                .build();

        when(geminiService.generateExecutiveSummary(any(AuditResponse.class), any(), any())).thenReturn(summary);

        mockMvc.perform(post("/api/v1/ai/executive-summary")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(audit)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.overallHealthStatus").value("HEALTHY"));
    }

    @Test
    void generateSchemaJsonLd_returnsAiSchemaGenerationResponse() throws Exception {
        AuditResponse audit = AuditResponse.builder()
                .id(1L)
                .url("https://github.com")
                .domain("github.com")
                .build();

        com.pulse.page.web.dto.AiSchemaGenerationRequest request = com.pulse.page.web.dto.AiSchemaGenerationRequest.builder()
                .audit(audit)
                .schemaType("SoftwareApplication")
                .build();

        com.pulse.page.web.dto.AiSchemaGenerationResponse response = com.pulse.page.web.dto.AiSchemaGenerationResponse.builder()
                .success(true)
                .detectedType("SoftwareApplication")
                .jsonLdScript("<script type=\"application/ld+json\">{}</script>")
                .build();

        when(geminiService.generateRichSchemaJsonLd(any(AuditResponse.class), any(), eq("SoftwareApplication"), any()))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/ai/schema-generator")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.detectedType").value("SoftwareApplication"));
    }

    @Test
    void chatWithAiAssistant_returnsAiChatResponse() throws Exception {
        AuditResponse audit = AuditResponse.builder()
                .id(1L)
                .url("https://github.com")
                .domain("github.com")
                .build();

        com.pulse.page.web.dto.AiChatRequest request = com.pulse.page.web.dto.AiChatRequest.builder()
                .audit(audit)
                .conversationHistory(List.of())
                .userMessage("How can I optimize this H1?")
                .build();

        com.pulse.page.web.dto.AiChatResponse response = com.pulse.page.web.dto.AiChatResponse.builder()
                .success(true)
                .reply("Use primary keywords in your main H1 tag.")
                .build();

        when(geminiService.chatWithAiAssistant(any(AuditResponse.class), any(), eq("How can I optimize this H1?"), any(), any()))
                .thenReturn(response);

        mockMvc.perform(post("/api/v1/ai/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.reply").value("Use primary keywords in your main H1 tag."));
    }

    @Test
    void getAvailableModels_withHeader_returnsGeminiModelsResponse() throws Exception {
        when(geminiService.fetchAvailableModelsDetailed("AIzaSyHeaderKey")).thenReturn(List.of(
                com.pulse.page.web.dto.GeminiModelDto.builder()
                        .id("gemini-2.0-flash")
                        .displayName("Gemini 2.0 Flash")
                        .isRecommended(true)
                        .build()
        ));
        when(geminiService.resolveOptimalModel(any())).thenReturn("gemini-2.0-flash");

        mockMvc.perform(get("/api/v1/ai/models")
                        .header("X-Gemini-Api-Key", "AIzaSyHeaderKey"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.activeModel").value("gemini-2.0-flash"))
                .andExpect(jsonPath("$.models[0].id").value("gemini-2.0-flash"));
    }

    @Test
    void discoverModelsWithKey_returnsGeminiModelsResponse() throws Exception {
        when(geminiService.fetchAvailableModelsDetailed("AIzaSyCustomKey")).thenReturn(List.of(
                com.pulse.page.web.dto.GeminiModelDto.builder()
                        .id("gemini-1.5-pro")
                        .displayName("Gemini 1.5 Pro")
                        .build()
        ));
        when(geminiService.resolveOptimalModel(any())).thenReturn("gemini-1.5-pro");

        mockMvc.perform(post("/api/v1/ai/models/discover")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("apiKey", "AIzaSyCustomKey"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.activeModel").value("gemini-1.5-pro"))
                .andExpect(jsonPath("$.models[0].id").value("gemini-1.5-pro"));
    }
}

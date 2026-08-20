package com.pulse.page.web.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.model.SeoMetrics;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.service.AiRecommendationService;
import com.pulse.page.web.service.AuditReportProcessorService;
import com.pulse.page.web.service.CacheService;
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
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
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
    private AuditReportJpaRepository jpaRepository;

    @Mock
    private AuditReportProcessorService processorService;

    @Mock
    private CacheService cacheService;

    @InjectMocks
    private AiRecommendationController controller;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, false)
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    @BeforeEach
    @SuppressWarnings({"deprecation", "removal"})
    void setUp() {
        org.springframework.http.converter.json.MappingJackson2HttpMessageConverter converter =
                new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(objectMapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setMessageConverters(converter)
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
}

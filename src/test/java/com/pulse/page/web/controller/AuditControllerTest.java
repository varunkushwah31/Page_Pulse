package com.pulse.page.web.controller;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.exception.AuditTimeoutException;
import com.pulse.page.web.exception.GlobalExceptionHandler;
import com.pulse.page.web.exception.InvalidUrlException;
import com.pulse.page.web.exception.TargetHostUnreachableException;
import com.pulse.page.web.model.AuditScoreBreakdown;
import com.pulse.page.web.service.AuditPersistenceService;
import com.pulse.page.web.service.AuditProgressStreamService;
import com.pulse.page.web.service.AuditReportProcessorService;
import com.pulse.page.web.service.UrlAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class AuditControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UrlAuditService urlAuditService;

    @Mock
    private AuditReportProcessorService processorService;

    @Mock
    private AuditPersistenceService persistenceService;

    @Mock
    private AuditProgressStreamService streamService;

    @BeforeEach
    void setUp() {
        AuditController controller = new AuditController(urlAuditService, processorService, persistenceService, streamService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void auditUrl_getEndpoint_returnsTransientEntity() throws Exception {
        AuditReportEntity mockEntity = AuditReportEntity.builder()
            .id(1L)
            .url("https://example.com")
            .domain("example.com")
            .httpStatus(200)
            .responseTimeMs(120L)
            .h1Count(1)
            .overallScore(92)
            .healthGrade(HealthGrade.EXCELLENT)
            .build();

        when(urlAuditService.auditAndSaveTransient("https://example.com")).thenReturn(mockEntity);

        mockMvc.perform(get("/api/audit").param("url", "https://example.com"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.url").value("https://example.com"))
            .andExpect(jsonPath("$.overallScore").value(92));
    }

    @Test
    void runFullAudit_postEndpoint_returnsAuditResponseWithScores() throws Exception {
        AuditScoreBreakdown score = AuditScoreBreakdown.builder()
            .seoScore(90)
            .contentScore(85)
            .accessibilityScore(95)
            .performanceScore(90)
            .overallScore(90)
            .healthGrade(HealthGrade.EXCELLENT)
            .build();

        AuditResponse response = AuditResponse.builder()
            .id(1L)
            .url("https://example.com")
            .domain("example.com")
            .httpStatus(200)
            .scores(score)
            .cached(false)
            .build();

        when(processorService.processAudit("https://example.com")).thenReturn(response);

        mockMvc.perform(post("/api/audit/run")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"url\":\"https://example.com\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.url").value("https://example.com"))
            .andExpect(jsonPath("$.scores.overallScore").value(90));
    }

    @Test
    void auditUrl_invalidUrlException_returns400BadRequest() throws Exception {
        when(urlAuditService.auditAndSaveTransient(anyString()))
            .thenThrow(new InvalidUrlException("Invalid URL format"));

        mockMvc.perform(get("/api/audit").param("url", "ftp://invalid"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.status").value(400))
            .andExpect(jsonPath("$.message").value("Invalid URL format"));
    }

    @Test
    void auditUrl_auditTimeoutException_returns504GatewayTimeout() throws Exception {
        when(urlAuditService.auditAndSaveTransient(anyString()))
            .thenThrow(new AuditTimeoutException("Fetch timed out"));

        mockMvc.perform(get("/api/audit").param("url", "https://slow-site.com"))
            .andExpect(status().isGatewayTimeout())
            .andExpect(jsonPath("$.status").value(504));
    }

    @Test
    void auditUrl_targetHostUnreachableException_returns502BadGateway() throws Exception {
        when(urlAuditService.auditAndSaveTransient(anyString()))
            .thenThrow(new TargetHostUnreachableException("Host unreachable"));

        mockMvc.perform(get("/api/audit").param("url", "https://unreachable.com"))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.status").value(502));
    }
}

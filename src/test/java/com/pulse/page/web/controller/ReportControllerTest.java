package com.pulse.page.web.controller;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.exception.GlobalExceptionHandler;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.service.ReportSearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ReportControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ReportSearchService reportSearchService;

    @BeforeEach
    void setUp() {
        ReportController controller = new ReportController(reportSearchService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void getSavedReports_returnsPaginatedMongoReports() throws Exception {
        AuditReportDocument doc = AuditReportDocument.builder()
            .id("doc-1")
            .url("https://example.com")
            .domain("example.com")
            .overallScore(88)
            .healthGrade(HealthGrade.EXCELLENT)
            .build();

        when(reportSearchService.searchSavedReports(any()))
            .thenReturn(new PageImpl<>(List.of(doc), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/v1/reports"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content[0].id").value("doc-1"))
            .andExpect(jsonPath("$.content[0].domain").value("example.com"));
    }

    @Test
    void getSavedReportById_existingId_returnsReport() throws Exception {
        AuditReportDocument doc = AuditReportDocument.builder()
            .id("doc-1")
            .url("https://example.com")
            .overallScore(88)
            .build();

        when(reportSearchService.getSavedReportById("doc-1")).thenReturn(Optional.of(doc));

        mockMvc.perform(get("/api/v1/reports/doc-1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("doc-1"));
    }

    @Test
    void getSavedReportById_missingId_returns404NotFound() throws Exception {
        when(reportSearchService.getSavedReportById("doc-999"))
            .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/reports/doc-999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void deleteSavedReport_missingId_returns404NotFound() throws Exception {
        doThrow(new ReportNotFoundException("Report doc-999 not found"))
            .when(reportSearchService).deleteSavedReport("doc-999");

        mockMvc.perform(delete("/api/v1/reports/doc-999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.message").value("Report doc-999 not found"));
    }
}

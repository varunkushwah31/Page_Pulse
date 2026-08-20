package com.pulse.page.web.controller;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.exception.GlobalExceptionHandler;
import com.pulse.page.web.service.PdfReportGeneratorService;
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

    @Mock
    private PdfReportGeneratorService pdfReportGeneratorService;

    @BeforeEach
    void setUp() {
        ReportController controller = new ReportController(reportSearchService, pdfReportGeneratorService);
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.pulse.page.web.config.JacksonConfig().objectMapper();
        org.springframework.http.converter.json.MappingJackson2HttpMessageConverter jacksonConverter =
                new org.springframework.http.converter.json.MappingJackson2HttpMessageConverter(mapper);
        org.springframework.http.converter.ByteArrayHttpMessageConverter byteConverter =
                new org.springframework.http.converter.ByteArrayHttpMessageConverter();

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .setControllerAdvice(new GlobalExceptionHandler())
            .setMessageConverters(byteConverter, jacksonConverter)
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
    void downloadPdfReport_existingId_returnsPdfBytes() throws Exception {
        byte[] pdfBytes = "%PDF-1.4 Mock Content".getBytes();
        when(pdfReportGeneratorService.generatePdfReport("doc-1")).thenReturn(pdfBytes);

        mockMvc.perform(get("/api/v1/reports/doc-1/pdf"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition", "attachment; filename=\"audit-report-doc-1.pdf\""))
            .andExpect(content().contentType("application/pdf"));
    }

    @Test
    void downloadCustomPdfReport_returnsPdfBytes() throws Exception {
        byte[] pdfBytes = "%PDF-1.4 Custom Mock Content".getBytes();
        when(pdfReportGeneratorService.generatePdfReport(eq("doc-1"), any())).thenReturn(pdfBytes);

        mockMvc.perform(post("/api/v1/reports/doc-1/pdf")
                        .contentType("application/json")
                        .content("{\"companyName\":\"Acme\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"audit-report-doc-1-custom.pdf\""))
                .andExpect(content().contentType("application/pdf"));
    }

    @Test
    void exportPdfFromAudit_validRequest_returnsPdfBytes() throws Exception {
        byte[] pdfBytes = "%PDF-1.4 Direct Audit Export".getBytes();
        when(pdfReportGeneratorService.generatePdfReportFromAudit(any(), any())).thenReturn(pdfBytes);

        String jsonPayload = """
            {
                "audit": {
                    "id": 1,
                    "url": "https://wikipedia.org",
                    "domain": "wikipedia.org",
                    "httpStatus": 200,
                    "overallScore": 73
                }
            }
            """;

        mockMvc.perform(post("/api/v1/reports/pdf/export")
                        .contentType("application/json")
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"audit-report-wikipedia.org.pdf\""))
                .andExpect(content().contentType("application/pdf"));
    }

    @Test
    void getSavedReportById_missingId_returns404NotFound() throws Exception {
        when(reportSearchService.getSavedReportById("doc-999"))
            .thenReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/reports/doc-999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404));
    }
}

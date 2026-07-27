package com.pulse.page.web.service;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.mongo.AuditReportMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PdfReportGeneratorServiceTest {

    @Mock
    private AuditReportMongoRepository mongoRepository;

    @Mock
    private AuditReportJpaRepository jpaRepository;

    private PdfReportGeneratorService pdfReportGeneratorService;

    @BeforeEach
    void setUp() {
        pdfReportGeneratorService = new PdfReportGeneratorService(mongoRepository, jpaRepository);
    }

    @Test
    void generatePdfReport_existingMongoReport_returnsNonEmptyPdfBytes() {
        AuditReportDocument doc = AuditReportDocument.builder()
            .id("doc-100")
            .url("https://example.com")
            .domain("example.com")
            .overallScore(90)
            .healthGrade(HealthGrade.EXCELLENT)
            .seoScore(95)
            .contentScore(90)
            .accessibilityScore(85)
            .performanceScore(90)
            .build();

        when(mongoRepository.findById("doc-100")).thenReturn(Optional.of(doc));

        byte[] pdfBytes = pdfReportGeneratorService.generatePdfReport("doc-100");
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 100);

        String pdfHeader = new String(pdfBytes, 0, 5);
        assertEquals("%PDF-", pdfHeader);
    }

    @Test
    void generatePdfReport_existingJpaTransientReport_returnsNonEmptyPdfBytes() {
        AuditReportEntity entity = AuditReportEntity.builder()
            .id(42L)
            .url("https://transient-example.com")
            .domain("transient-example.com")
            .overallScore(85)
            .healthGrade(HealthGrade.GOOD)
            .seoScore(80)
            .contentScore(85)
            .accessibilityScore(90)
            .performanceScore(85)
            .build();

        when(mongoRepository.findById("42")).thenReturn(Optional.empty());
        when(jpaRepository.findById(42L)).thenReturn(Optional.of(entity));

        byte[] pdfBytes = pdfReportGeneratorService.generatePdfReport("42");
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 100);

        String pdfHeader = new String(pdfBytes, 0, 5);
        assertEquals("%PDF-", pdfHeader);
    }

    @Test
    void generatePdfReport_missingReport_throwsReportNotFoundException() {
        when(mongoRepository.findById("doc-missing")).thenReturn(Optional.empty());

        assertThrows(ReportNotFoundException.class, () ->
            pdfReportGeneratorService.generatePdfReport("doc-missing")
        );
    }
}

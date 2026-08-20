package com.pulse.page.web.service;

import com.pulse.page.web.config.AppProperties;
import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.PdfBrandingConfig;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.model.*;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.mongo.AuditReportMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PdfReportGeneratorServiceTest {

    @Mock
    private AuditReportMongoRepository mongoRepository;

    @Mock
    private AuditReportJpaRepository jpaRepository;

    @Mock
    private CacheService cacheService;

    private PdfReportGeneratorService pdfReportGeneratorService;

    @BeforeEach
    void setUp() {
        AiRecommendationService recommendationService = new AiRecommendationService(new AppProperties());
        pdfReportGeneratorService = new PdfReportGeneratorService(mongoRepository, jpaRepository, cacheService, recommendationService);
    }

    @Test
    @DisplayName("Should generate non-empty PDF bytes for existing Mongo report")
    void generatePdfReportExistingMongoReportReturnsNonEmptyPdfBytes() {
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
        when(cacheService.getCachedAudit("https://example.com")).thenReturn(Optional.empty());

        byte[] pdfBytes = pdfReportGeneratorService.generatePdfReport("doc-100");
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 100);

        String pdfHeader = new String(pdfBytes, 0, 5);
        assertEquals("%PDF-", pdfHeader);
    }

    @Test
    @DisplayName("Should generate non-empty PDF bytes for existing JPA transient report")
    void generatePdfReportExistingJpaTransientReportReturnsNonEmptyPdfBytes() {
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
        when(cacheService.getCachedAudit("https://transient-example.com")).thenReturn(Optional.empty());

        byte[] pdfBytes = pdfReportGeneratorService.generatePdfReport("42");
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 100);

        String pdfHeader = new String(pdfBytes, 0, 5);
        assertEquals("%PDF-", pdfHeader);
    }

    @Test
    @DisplayName("Should generate detailed PDF report with full metrics")
    void generatePdfReportFromAuditWithFullMetricsGeneratesDetailedPdf() {
        AuditResponse audit = AuditResponse.builder()
            .id(1L)
            .url("https://wikipedia.org")
            .domain("wikipedia.org")
            .httpStatus(200)
            .responseTimeMs(2956)
            .contentType("text/html")
            .seoMetrics(SeoMetrics.builder()
                .hasTitle(true)
                .pageTitle("Wikipedia, the free encyclopedia")
                .titleLength(32)
                .hasMetaDescription(true)
                .metaDescription("Wikipedia is a free online encyclopedia...")
                .descriptionLength(44)
                .isIndexable(true)
                .isFollowable(true)
                .hasViewportMeta(true)
                .openGraphComplete(true)
                .hasStructuredData(true)
                .build())
            .contentMetrics(ContentMetrics.builder()
                .wordCount(147)
                .headingCounts(Map.of("h1", 1))
                .paragraphCount(4)
                .readabilityMetrics(ReadabilityMetrics.builder()
                    .fleschKincaidReadingEase(65.0)
                    .fleschKincaidGradeLevel(8.0)
                    .readingEaseLevel("Standard")
                    .build())
                .build())
            .accessibilityMetrics(AccessibilityMetrics.builder()
                .imagesMissingAltCount(0)
                .totalImageCount(10)
                .hasHtmlLangAttribute(true)
                .htmlLangValue("en")
                .hasMainLandmark(true)
                .build())
            .performanceMetrics(PerformanceMetrics.builder()
                .statusCode(200)
                .responseTimeMs(2956)
                .hasCompression(true)
                .contentEncoding("gzip")
                .maxDomDepth(15)
                .totalDomNodesCount(500)
                .build())
            .coreWebVitals(CoreWebVitals.builder()
                .lcpMs(1800)
                .fcpMs(900)
                .ttfbMs(150)
                .clsRatio(0.01)
                .inpMs(80)
                .overallGrade("GOOD")
                .build())
            .securityMetrics(SecurityMetrics.builder()
                .isHttps(true)
                .sslValid(true)
                .tlsVersion("TLS 1.3")
                .sslIssuer("Let's Encrypt")
                .daysUntilSslExpiry(85)
                .securityHeadersPresent(Map.of("HSTS", true))
                .build())
            .scores(AuditScoreBreakdown.builder()
                .overallScore(73)
                .healthGrade(HealthGrade.GOOD)
                .seoScore(60)
                .contentScore(75)
                .accessibilityScore(93)
                .performanceScore(70)
                .build())
            .build();

        PdfBrandingConfig branding = PdfBrandingConfig.builder()
            .companyName("PagePulse Pro")
            .primaryColorHex("#0F172A")
            .footerText("Confidential • Prepared for PagePulse")
            .build();

        byte[] pdfBytes = pdfReportGeneratorService.generatePdfReportFromAudit(audit, branding);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500);

        String pdfHeader = new String(pdfBytes, 0, 5);
        assertEquals("%PDF-", pdfHeader);
    }

    @Test
    @DisplayName("Should throw ReportNotFoundException when report is missing")
    void generatePdfReportMissingReportThrowsReportNotFoundException() {
        when(mongoRepository.findById("doc-missing")).thenReturn(Optional.empty());

        assertThrows(ReportNotFoundException.class, () ->
            pdfReportGeneratorService.generatePdfReport("doc-missing")
        );
    }
}


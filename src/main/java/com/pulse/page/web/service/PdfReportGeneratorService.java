package com.pulse.page.web.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.mongo.AuditReportMongoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfReportGeneratorService {

    private final AuditReportMongoRepository mongoRepository;
    private final AuditReportJpaRepository jpaRepository;

    private static final Color COLOR_PRIMARY = new Color(15, 23, 42);      // Slate 900
    private static final Color COLOR_ACCENT = new Color(37, 99, 235);      // Blue 600
    private static final Color COLOR_BG_LIGHT = new Color(248, 250, 252);  // Slate 50
    private static final Color COLOR_BORDER = new Color(226, 232, 240);    // Slate 200

    private static final Font FONT_TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, Color.WHITE);
    private static final Font FONT_SUBTITLE = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(203, 213, 225));
    private static final Font FONT_SECTION = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, COLOR_PRIMARY);
    private static final Font FONT_LABEL = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, COLOR_PRIMARY);
    private static final Font FONT_VALUE = FontFactory.getFont(FontFactory.HELVETICA, 10, COLOR_PRIMARY);
    private static final Font FONT_SCORE_BIG = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 28, Color.WHITE);
    private static final Font FONT_GRADE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.WHITE);

    public byte[] generatePdfReport(String reportId) {
        return generatePdfReport(reportId, null);
    }

    public byte[] generatePdfReport(String reportId, com.pulse.page.web.dto.PdfBrandingConfig branding) {
        log.info("Generating OpenPDF State-of-the-Art Audit Report for ID: {} (Branded: {})", reportId, branding != null);

        AuditReportDocument doc = mongoRepository.findById(reportId)
            .orElseGet(() -> {
                try {
                    Long tempId = Long.parseLong(reportId);
                    return jpaRepository.findById(tempId)
                        .map(this::mapEntityToDocument)
                        .orElse(null);
                } catch (NumberFormatException e) {
                    log.debug("Non-numeric report ID cannot be retrieved from JPA: {}", reportId, e);
                    return null;
                }
            });

        if (doc == null) {
            throw new ReportNotFoundException("Report with ID '" + reportId + "' not found for PDF export.");
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        com.lowagie.text.Document pdfDoc = new com.lowagie.text.Document(PageSize.A4, 36, 36, 36, 45);

        Color primaryColor = parsePrimaryColor(branding);

        try {
            PdfWriter writer = PdfWriter.getInstance(pdfDoc, out);
            String customFooter = (branding != null && branding.getFooterText() != null && !branding.getFooterText().isBlank())
                ? branding.getFooterText()
                : "PagePulse Web Auditing Engine";
            writer.setPageEvent(new HeaderFooterPageEvent(customFooter));
            pdfDoc.open();

            // 1. Header Banner
            buildHeaderBanner(pdfDoc, doc, branding, primaryColor);

            pdfDoc.add(new Paragraph(" "));

            // 2. Score Badge Card & Summary
            buildScoreSummaryCard(pdfDoc, doc);

            pdfDoc.add(new Paragraph(" "));

            // 3. Sub-Score Breakdown Table
            buildSubScoresTable(pdfDoc, doc);

            pdfDoc.add(new Paragraph(" "));

            // 4. Key Technical Metrics Grid
            buildMetricsGridTable(pdfDoc, doc);

            pdfDoc.close();
        } catch (DocumentException e) {
            log.error("Failed to generate PDF document for report ID {}: {}", reportId, e.getMessage(), e);
            throw new IllegalStateException("PDF document generation failed: " + e.getMessage(), e);
        }

        return out.toByteArray();
    }

    private Color parsePrimaryColor(com.pulse.page.web.dto.PdfBrandingConfig branding) {
        if (branding != null && branding.getPrimaryColorHex() != null && !branding.getPrimaryColorHex().isBlank()) {
            try {
                String hex = branding.getPrimaryColorHex().trim();
                if (!hex.startsWith("#")) hex = "#" + hex;
                return Color.decode(hex);
            } catch (Exception e) {
                log.warn("Invalid primaryColorHex '{}', falling back to default primary color: {}", branding.getPrimaryColorHex(), e.getMessage());
            }
        }
        return COLOR_PRIMARY;
    }

    private void buildHeaderBanner(com.lowagie.text.Document pdfDoc, AuditReportDocument doc, com.pulse.page.web.dto.PdfBrandingConfig branding, Color primaryColor) throws DocumentException {
        PdfPTable headerTable = new PdfPTable(1);
        headerTable.setWidthPercentage(100);

        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(primaryColor);
        cell.setPadding(16);
        cell.setBorder(Rectangle.NO_BORDER);

        String titleText = "PAGEPULSE EXECUTIVE AUDIT REPORT";
        if (branding != null) {
            if (branding.getCompanyName() != null && !branding.getCompanyName().isBlank()) {
                titleText = branding.getCompanyName().toUpperCase() + " AUDIT REPORT";
            }
            if (branding.getHeaderText() != null && !branding.getHeaderText().isBlank()) {
                titleText = branding.getHeaderText().toUpperCase();
            }
        }

        Paragraph title = new Paragraph(titleText, FONT_TITLE);
        title.setSpacingAfter(4);
        cell.addElement(title);

        String auditDate = doc.getSavedAt() != null ?
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z").withZone(ZoneId.systemDefault()).format(doc.getSavedAt()) : "N/A";

        Paragraph meta = new Paragraph("Target URL: " + doc.getUrl() + "  |  Report ID: " + doc.getId() + "  |  Generated: " + auditDate, FONT_SUBTITLE);
        cell.addElement(meta);

        headerTable.addCell(cell);
        pdfDoc.add(headerTable);
    }

    private void buildScoreSummaryCard(com.lowagie.text.Document pdfDoc, AuditReportDocument doc) throws DocumentException {
        PdfPTable summaryTable = new PdfPTable(2);
        summaryTable.setWidthPercentage(100);
        summaryTable.setWidths(new float[]{1.2f, 2.8f});

        Color gradeColor = resolveGradeColor(doc.getHealthGrade());

        // Score Badge Cell
        PdfPCell badgeCell = new PdfPCell();
        badgeCell.setBackgroundColor(gradeColor);
        badgeCell.setPadding(14);
        badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        badgeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        badgeCell.setBorder(Rectangle.NO_BORDER);

        Paragraph scorePara = new Paragraph(String.valueOf(doc.getOverallScore()), FONT_SCORE_BIG);
        scorePara.setAlignment(Element.ALIGN_CENTER);
        badgeCell.addElement(scorePara);

        String gradeStr = doc.getHealthGrade() != null ? doc.getHealthGrade().name() : "N/A";
        Paragraph gradePara = new Paragraph(gradeStr, FONT_GRADE);
        gradePara.setAlignment(Element.ALIGN_CENTER);
        badgeCell.addElement(gradePara);

        summaryTable.addCell(badgeCell);

        // Metadata Cell
        PdfPCell textCell = new PdfPCell();
        textCell.setBackgroundColor(COLOR_BG_LIGHT);
        textCell.setPadding(14);
        textCell.setBorderColor(COLOR_BORDER);

        Paragraph header = new Paragraph("Executive Audit Summary", FONT_SECTION);
        header.setSpacingAfter(8);
        textCell.addElement(header);

        textCell.addElement(new Paragraph("Domain: " + doc.getDomain(), FONT_VALUE));
        textCell.addElement(new Paragraph("HTTP Status: " + doc.getHttpStatus() + " OK", FONT_VALUE));
        textCell.addElement(new Paragraph("Latency: " + doc.getResponseTimeMs() + " ms", FONT_VALUE));
        textCell.addElement(new Paragraph("Content-Type: " + (doc.getContentType() != null ? doc.getContentType() : "text/html"), FONT_VALUE));

        summaryTable.addCell(textCell);
        pdfDoc.add(summaryTable);
    }

    private void buildSubScoresTable(com.lowagie.text.Document pdfDoc, AuditReportDocument doc) throws DocumentException {
        Paragraph sectionHeader = new Paragraph("Audit Sub-Score Breakdown", FONT_SECTION);
        sectionHeader.setSpacingAfter(8);
        pdfDoc.add(sectionHeader);

        PdfPTable table = new PdfPTable(4);
        table.setWidthPercentage(100);

        addHeaderCell(table, "SEO");
        addHeaderCell(table, "Content");
        addHeaderCell(table, "Accessibility");
        addHeaderCell(table, "Performance");

        addScoreValueCell(table, doc.getSeoScore());
        addScoreValueCell(table, doc.getContentScore());
        addScoreValueCell(table, doc.getAccessibilityScore());
        addScoreValueCell(table, doc.getPerformanceScore());

        pdfDoc.add(table);
    }

    private void buildMetricsGridTable(com.lowagie.text.Document pdfDoc, AuditReportDocument doc) throws DocumentException {
        Paragraph sectionHeader = new Paragraph("Detailed DOM & Page Metrics", FONT_SECTION);
        sectionHeader.setSpacingAfter(8);
        pdfDoc.add(sectionHeader);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.5f, 3.5f});

        addGridRow(table, "Page Title", doc.getPageTitle() != null ? doc.getPageTitle() : "None");
        addGridRow(table, "Meta Description", doc.getMetaDescription() != null ? doc.getMetaDescription() : "None");
        addGridRow(table, "H1 Heading Count", String.valueOf(doc.getH1Count()));
        addGridRow(table, "Word Count", String.valueOf(doc.getWordCount()));
        addGridRow(table, "Images Missing Alt", String.valueOf(doc.getImagesMissingAltCount()));
        addGridRow(table, "Response Time", doc.getResponseTimeMs() + " ms");

        pdfDoc.add(table);
    }

    private void addHeaderCell(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, FONT_LABEL));
        cell.setBackgroundColor(COLOR_BG_LIGHT);
        cell.setPadding(8);
        cell.setBorderColor(COLOR_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }

    private void addScoreValueCell(PdfPTable table, int score) {
        PdfPCell cell = new PdfPCell(new Phrase(score + " / 100", FONT_VALUE));
        cell.setPadding(8);
        cell.setBorderColor(COLOR_BORDER);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        table.addCell(cell);
    }

    private void addGridRow(PdfPTable table, String label, String value) {
        PdfPCell cellLabel = new PdfPCell(new Phrase(label, FONT_LABEL));
        cellLabel.setBackgroundColor(COLOR_BG_LIGHT);
        cellLabel.setPadding(6);
        cellLabel.setBorderColor(COLOR_BORDER);
        table.addCell(cellLabel);

        PdfPCell cellVal = new PdfPCell(new Phrase(value, FONT_VALUE));
        cellVal.setPadding(6);
        cellVal.setBorderColor(COLOR_BORDER);
        table.addCell(cellVal);
    }

    private Color resolveGradeColor(HealthGrade grade) {
        if (grade == null) return COLOR_ACCENT;
        return switch (grade) {
            case EXCELLENT -> new Color(16, 185, 129);       // Emerald Green
            case GOOD -> new Color(59, 130, 246);            // Royal Blue
            case NEEDS_IMPROVEMENT -> new Color(245, 158, 11); // Amber
            case POOR -> new Color(239, 68, 68);             // Crimson Red
        };
    }

    private AuditReportDocument mapEntityToDocument(AuditReportEntity entity) {
        return AuditReportDocument.builder()
            .id(String.valueOf(entity.getId()))
            .originalTempId(entity.getId())
            .url(entity.getUrl())
            .domain(entity.getDomain())
            .httpStatus(entity.getHttpStatus())
            .responseTimeMs(entity.getResponseTimeMs())
            .pageTitle(entity.getPageTitle())
            .metaDescription(entity.getMetaDescription())
            .h1Count(entity.getH1Count())
            .imagesMissingAltCount(entity.getImagesMissingAltCount())
            .wordCount(entity.getWordCount())
            .contentType(entity.getContentType())
            .seoScore(entity.getSeoScore())
            .contentScore(entity.getContentScore())
            .accessibilityScore(entity.getAccessibilityScore())
            .performanceScore(entity.getPerformanceScore())
            .overallScore(entity.getOverallScore())
            .healthGrade(entity.getHealthGrade())
            .savedAt(entity.getCreatedAt())
            .build();
    }

    private static class HeaderFooterPageEvent extends PdfPageEventHelper {
        private static final Font FONT_FOOTER = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(148, 163, 184));
        private final String footerPrefix;

        public HeaderFooterPageEvent(String footerPrefix) {
            this.footerPrefix = footerPrefix;
        }

        @Override
        public void onEndPage(PdfWriter writer, com.lowagie.text.Document document) {
            PdfContentByte cb = writer.getDirectContent();
            String footerText = footerPrefix + "  |  Page " + writer.getPageNumber();
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, new Phrase(footerText, FONT_FOOTER),
                (document.right() - document.left()) / 2 + document.leftMargin(), document.bottom() - 20, 0);
        }
    }
}

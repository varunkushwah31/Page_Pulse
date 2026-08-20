package com.pulse.page.web.controller;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.dto.PlatformStatsResponse;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.service.PdfReportGeneratorService;
import com.pulse.page.web.service.ReportSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportSearchService reportSearchService;
    private final PdfReportGeneratorService pdfReportGeneratorService;

    @GetMapping
    public ResponseEntity<Page<AuditReportDocument>> getSavedReports(@PageableDefault(size = 10) Pageable pageable) {
        Page<AuditReportDocument> reports = reportSearchService.searchSavedReports(pageable);
        return ResponseEntity.ok(reports);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AuditReportDocument> getSavedReportById(@PathVariable String id) {
        return reportSearchService.getSavedReportById(id)
            .map(ResponseEntity::ok)
            .orElseThrow(() -> new ReportNotFoundException("Saved audit report with ID '" + id + "' not found."));
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadPdfReport(@PathVariable String id) {
        byte[] pdfBytes = pdfReportGeneratorService.generatePdfReport(id);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-report-" + id + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }

    @PostMapping("/{id}/pdf")
    public ResponseEntity<byte[]> downloadCustomPdfReport(
            @PathVariable String id,
            @RequestBody(required = false) com.pulse.page.web.dto.PdfBrandingConfig branding) {
        byte[] pdfBytes = pdfReportGeneratorService.generatePdfReport(id, branding);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit-report-" + id + "-custom.pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }

    @PostMapping("/pdf/export")
    public ResponseEntity<byte[]> exportPdfFromAudit(
            @RequestBody com.pulse.page.web.dto.AuditPdfExportRequest request) {
        if (request == null || request.getAudit() == null) {
            return ResponseEntity.badRequest().build();
        }
        byte[] pdfBytes = pdfReportGeneratorService.generatePdfReportFromAudit(request.getAudit(), request.getBranding());
        String domain = request.getAudit().getDomain() != null ? request.getAudit().getDomain().replaceAll("[^a-zA-Z0-9.-]", "_") : "web";
        String filename = "audit-report-" + domain + ".pdf";
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdfBytes);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSavedReport(@PathVariable String id) {
        reportSearchService.deleteSavedReport(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<PlatformStatsResponse> getPlatformStats() {
        PlatformStatsResponse stats = reportSearchService.getPlatformStats();
        return ResponseEntity.ok(stats);
    }
}

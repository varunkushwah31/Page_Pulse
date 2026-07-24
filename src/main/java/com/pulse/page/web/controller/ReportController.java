package com.pulse.page.web.controller;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.dto.PlatformStatsResponse;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.service.ReportSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportSearchService reportSearchService;

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

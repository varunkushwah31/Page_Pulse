package com.pulse.page.web.controller;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.dto.AuditRequest;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.service.AuditPersistenceService;
import com.pulse.page.web.service.AuditReportProcessorService;
import com.pulse.page.web.service.UrlAuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/audit")
@Validated
@RequiredArgsConstructor
public class AuditController {

    private final UrlAuditService urlAuditService;
    private final AuditReportProcessorService processorService;
    private final AuditPersistenceService persistenceService;

    @GetMapping
    public ResponseEntity<AuditReportEntity> auditUrl(@RequestParam String url) throws IOException {
        AuditReportEntity transientRecord = urlAuditService.auditAndSaveTransient(url);
        return ResponseEntity.ok(transientRecord);
    }

    @PostMapping("/run")
    public ResponseEntity<AuditResponse> runFullAudit(@Valid @RequestBody AuditRequest request) throws IOException {
        AuditResponse response = processorService.processAudit(request.getUrl());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/save/{tempId}")
    public ResponseEntity<AuditReportDocument> saveAuditReport(@PathVariable Long tempId) {
        AuditReportDocument savedDocument = persistenceService.saveAuditReportToMongo(tempId);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedDocument);
    }
}

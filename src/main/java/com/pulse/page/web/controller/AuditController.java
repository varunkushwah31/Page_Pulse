package com.pulse.page.web.controller;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.dto.AuditRequest;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.service.AuditPersistenceService;
import com.pulse.page.web.service.AuditProgressStreamService;
import com.pulse.page.web.service.AuditReportProcessorService;
import com.pulse.page.web.service.UrlAuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final UrlAuditService urlAuditService;
    private final AuditReportProcessorService processorService;
    private final AuditPersistenceService persistenceService;
    private final AuditProgressStreamService streamService;

    @GetMapping
    public ResponseEntity<AuditReportEntity> auditUrl(@RequestParam("url") String url) throws IOException {
        AuditReportEntity report = urlAuditService.auditAndSaveTransient(url);
        return ResponseEntity.ok(report);
    }

    @PostMapping("/run")
    public ResponseEntity<AuditResponse> runFullAudit(@Valid @RequestBody AuditRequest request) throws IOException {
        AuditResponse response = processorService.processAudit(request.getUrl());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stream")
    public SseEmitter streamAuditProgress(@RequestParam("url") String url) {
        return streamService.streamAuditProgress(url);
    }

    @PostMapping("/save/{tempId}")
    public ResponseEntity<AuditReportDocument> saveAuditToMongo(@PathVariable("tempId") Long tempId) {
        AuditReportDocument savedDoc = persistenceService.saveAuditReportToMongo(tempId);
        return ResponseEntity.ok(savedDoc);
    }
}

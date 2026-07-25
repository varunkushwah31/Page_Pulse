package com.pulse.page.web.controller;

import com.pulse.page.web.dto.BatchAuditRequest;
import com.pulse.page.web.dto.BatchAuditResponse;
import com.pulse.page.web.service.BatchAuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit/batch")
@RequiredArgsConstructor
public class BatchAuditController {

    private final BatchAuditService batchAuditService;

    @PostMapping
    public ResponseEntity<BatchAuditResponse> submitBatchAudit(@Valid @RequestBody BatchAuditRequest request) {
        BatchAuditResponse response = batchAuditService.submitBatchAudit(request);
        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<BatchAuditResponse> getJobStatus(@PathVariable("jobId") String jobId) {
        return batchAuditService.getJobStatus(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<List<BatchAuditResponse>> getAllJobs() {
        return ResponseEntity.ok(batchAuditService.getAllJobs());
    }
}
package com.pulse.page.web.controller;

import com.pulse.page.web.dto.ScheduledAuditRequest;
import com.pulse.page.web.entity.ScheduledAuditConfigEntity;
import com.pulse.page.web.service.ScheduledAuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/scheduled-audits")
@RequiredArgsConstructor
public class ScheduledAuditController {

    private final ScheduledAuditService scheduledAuditService;

    @PostMapping
    public ResponseEntity<ScheduledAuditConfigEntity> createSchedule(@Valid @RequestBody ScheduledAuditRequest request) {
        ScheduledAuditConfigEntity config = scheduledAuditService.registerSchedule(
                request.getUrl(),
                request.getWebhookUrl(),
                request.getEmail(),
                request.getFrequencyMinutes(),
                request.getRegressionThreshold(),
                request.getNotifyOnRegressionOnly()
        );
        return ResponseEntity.ok(config);
    }

    @GetMapping
    public ResponseEntity<List<ScheduledAuditConfigEntity>> getAllSchedules() {
        return ResponseEntity.ok(scheduledAuditService.getAllSchedules());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScheduledAuditConfigEntity> getSchedule(@PathVariable Long id) {
        return scheduledAuditService.getSchedule(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ScheduledAuditConfigEntity> updateSchedule(
            @PathVariable Long id,
            @Valid @RequestBody ScheduledAuditRequest request) {
        return scheduledAuditService.updateSchedule(
                id,
                request.getWebhookUrl(),
                request.getEmail(),
                request.getFrequencyMinutes(),
                request.getRegressionThreshold(),
                request.getNotifyOnRegressionOnly()
        ).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ScheduledAuditConfigEntity> toggleSchedule(@PathVariable Long id) {
        return scheduledAuditService.getSchedule(id).map(config -> {
            config.setActive(!config.isActive());
            config.setUpdatedAt(java.time.Instant.now());
            return ResponseEntity.ok(config);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long id) {
        boolean deleted = scheduledAuditService.deleteSchedule(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
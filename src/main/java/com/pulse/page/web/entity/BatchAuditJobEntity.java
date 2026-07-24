package com.pulse.page.web.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "batch_audit_jobs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchAuditJobEntity {

    @Id
    @Column(length = 36)
    private String jobId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(nullable = false)
    private int totalUrls;

    @Column(nullable = false)
    private int completedUrls;

    @Column(nullable = false)
    private int failedUrls;

    @ElementCollection
    @CollectionTable(name = "batch_audit_urls", joinColumns = @JoinColumn(name = "job_id"))
    private List<String> urls;

    @Column(name = "webhook_url", length = 500)
    private String webhookUrl;

    @Column(name = "correlation_id", length = 36)
    private String correlationId;

    @CreationTimestamp
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    public enum Status {
        PENDING, RUNNING, COMPLETED, PARTIAL, FAILED
    }
}
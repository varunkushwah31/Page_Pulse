package com.pulse.page.web.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "batch_audit_results", indexes = {
        @Index(name = "idx_job_id", columnList = "job_id"),
        @Index(name = "idx_url", columnList = "url")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchAuditResultEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_id", nullable = false, length = 36)
    private String jobId;

    @Column(nullable = false)
    private String url;

    @Column(nullable = false)
    private String status; // SUCCESS, FAILED

    @Column(name = "audit_id", length = 36)
    private String auditId;

    @Column(name = "overall_score")
    private Integer overallScore;

    @Column(name = "error_message", length = 1000)
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

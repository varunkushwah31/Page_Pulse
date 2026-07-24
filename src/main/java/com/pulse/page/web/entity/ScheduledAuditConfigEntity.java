package com.pulse.page.web.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "scheduled_audit_configs")
public class ScheduledAuditConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(length = 2048)
    private String webhookUrl;

    @Column(length = 255)
    private String email;

    @Builder.Default
    private int frequencyMinutes = 60;

    private Instant lastAuditTime;

    private Integer previousOverallScore;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    @Column(name = "regression_threshold")
    @Builder.Default
    private int regressionThreshold = 15;

    @Column(name = "notify_on_regression_only")
    @Builder.Default
    private boolean notifyOnRegressionOnly = true;
}
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

    @Builder.Default
    private int frequencyMinutes = 60;

    private Instant lastAuditTime;

    private Integer previousOverallScore;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private Instant createdAt = Instant.now();
}

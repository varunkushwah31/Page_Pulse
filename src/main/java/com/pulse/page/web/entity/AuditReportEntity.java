package com.pulse.page.web.entity;

import com.pulse.page.web.enums.HealthGrade;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "audit_reports")
public class AuditReportEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(length = 255)
    private String domain;

    private int httpStatus;

    private long responseTimeMs;

    @Column(length = 1024)
    private String pageTitle;

    @Column(length = 2048)
    private String metaDescription;

    private int h1Count;

    private int imagesMissingAltCount;

    private int wordCount;

    private String contentType;

    private int seoScore;

    private int contentScore;

    private int accessibilityScore;

    private int performanceScore;

    private int overallScore;

    @Enumerated(EnumType.STRING)
    private HealthGrade healthGrade;

    @Builder.Default
    private Instant createdAt = Instant.now();
}

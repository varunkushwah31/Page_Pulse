package com.pulse.page.web.document;

import com.pulse.page.web.enums.HealthGrade;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "saved_audit_reports")
public class AuditReportDocument {

    @Id
    private String id;

    private Long originalTempId;

    private String url;

    private String domain;

    private int httpStatus;

    private long responseTimeMs;

    private String pageTitle;

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

    private HealthGrade healthGrade;

    @Builder.Default
    private Instant savedAt = Instant.now();

    private Long userId;
}

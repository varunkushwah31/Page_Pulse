package com.pulse.page.web.document;

import com.pulse.page.web.enums.HealthGrade;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "saved_audit_reports")
@CompoundIndexes({
    @CompoundIndex(name = "domain_savedAt_idx", def = "{'domain': 1, 'savedAt': -1}"),
    @CompoundIndex(name = "url_savedAt_idx", def = "{'url': 1, 'savedAt': -1}")
})
public class AuditReportDocument {

    @Id
    private String id;

    @Indexed
    private Long originalTempId;

    @Indexed
    private String url;

    @Indexed
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
    private boolean jsRendered = false;

    private String spaFramework;

    @Builder.Default
    @Indexed
    private Instant savedAt = Instant.now();

    private Long userId;
}

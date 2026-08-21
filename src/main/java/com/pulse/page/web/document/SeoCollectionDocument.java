package com.pulse.page.web.document;

import com.pulse.page.web.enums.HealthGrade;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "seo_collections")
public class SeoCollectionDocument {

    @Id
    private String id;

    private Long userId;

    private String username;

    private String name;

    private String description;

    @Builder.Default
    private String color = "#4FD8C4";

    @Builder.Default
    private String icon = "Folder";

    @Builder.Default
    private List<String> tags = new ArrayList<>();

    @Builder.Default
    private List<SeoCollectionItem> items = new ArrayList<>();

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    private Instant lastRunAt;

    private Double averageScore;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeoCollectionItem {
        private String id;
        private String name;
        private String url;
        @Builder.Default
        private String method = "AUDIT";
        @Builder.Default
        private boolean enableJsRendering = false;
        @Builder.Default
        private int expectedMinScore = 80;
        @Builder.Default
        private int maxResponseTimeMs = 3000;
        private Map<String, String> customHeaders;
        @Builder.Default
        private List<String> tags = new ArrayList<>();
        private CollectionAuditSummary lastAudit;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CollectionAuditSummary {
        private Long auditId;
        private String savedReportId;
        private Integer overallScore;
        private HealthGrade healthGrade;
        private Integer httpStatus;
        private Long responseTimeMs;
        private Integer seoScore;
        private Integer performanceScore;
        private Integer accessibilityScore;
        private Integer contentScore;
        private Integer issuesCount;
        private String pageTitle;
        private Instant auditedAt;
        private String status; // "PASSED", "WARNING", "FAILED"
        private String errorMessage;
    }
}

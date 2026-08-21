package com.pulse.page.web.dto;

import com.pulse.page.web.document.SeoCollectionDocument;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionRunResultDto {
    private String collectionId;
    private String collectionName;
    private int totalUrls;
    private int completedUrls;
    private int passedUrls;
    private int warningUrls;
    private int failedUrls;
    private Double averageScore;
    private Long durationMs;
    private Instant ranAt;
    private List<ItemRunResult> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemRunResult {
        private String itemId;
        private String name;
        private String url;
        private String status; // "PASSED", "WARNING", "FAILED"
        private Integer overallScore;
        private String healthGrade;
        private Integer httpStatus;
        private Long responseTimeMs;
        private Integer expectedMinScore;
        private Integer previousScore;
        private Integer scoreDelta;
        private Integer issuesCount;
        private String pageTitle;
        private Long auditId;
        private String errorMessage;
    }
}

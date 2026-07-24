package com.pulse.page.web.dto;

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
public class CompetitorComparisonResponse {

    private int totalCompetitors;
    private int successfulAudits;
    private int failedAudits;
    private List<CompetitorResult> results;
    private Summary summary;
    private Instant generatedAt;
    private String correlationId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompetitorResult {
        private int rank;
        private String url;
        private String status;
        private Long auditId;
        private Integer overallScore;
        private Integer seoScore;
        private Integer contentScore;
        private Integer accessibilityScore;
        private Integer performanceScore;
        private String healthGrade;
        private Long responseTimeMs;
        private Integer wordCount;
        private Integer h1Count;
        private Integer imagesMissingAlt;
        private boolean cached;
        private String error;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private String bestOverall;
        private String worstOverall;
        private Double averageOverallScore;
        private String bestSeo;
        private String bestContent;
        private String bestAccessibility;
        private String bestPerformance;
    }
}
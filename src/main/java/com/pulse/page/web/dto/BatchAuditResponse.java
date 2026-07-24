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
public class BatchAuditResponse {

    private String jobId;
    private String status;
    private int totalUrls;
    private int completedUrls;
    private int failedUrls;
    private List<BatchAuditUrlResult> results;
    private Instant submittedAt;
    private Instant completedAt;
    private String webhookUrl;
    private String correlationId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchAuditUrlResult {
        private String url;
        private String status;
        private Long auditId;
        private Integer overallScore;
        private String error;
    }
}
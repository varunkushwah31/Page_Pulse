package com.pulse.page.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.pulse.page.web.model.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AuditResponse {
    private Long id; // Transient H2 ID
    private String url;
    private String domain;
    private int httpStatus;
    private long responseTimeMs;
    private String contentType;

    private SeoMetrics seoMetrics;
    private ContentMetrics contentMetrics;
    private AccessibilityMetrics accessibilityMetrics;
    private PerformanceMetrics performanceMetrics;
    private CoreWebVitals coreWebVitals;
    private LinkInspectionMetrics linkMetrics;
    private SecurityMetrics securityMetrics;
    private AssetBottleneckMetrics assetBottleneckMetrics;
    private AuditScoreBreakdown scores;

    private boolean cached;

    @Builder.Default
    private Instant timestamp = Instant.now();
}

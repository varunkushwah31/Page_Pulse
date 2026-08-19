package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRecommendationDto {
    private String category;    // SEO, ACCESSIBILITY, CONTENT, PERFORMANCE, SECURITY
    private String priority;    // P0_CRITICAL, P1_MAJOR, P2_MODERATE, P3_LOW
    private String issue;       // Problem description
    private String title;       // Human-readable title
    private String codeSnippet; // Copyable HTML/meta code snippet
    private String explanation; // Explanation / implementation guidance
    private String impactLevel; // HIGH, MEDIUM, LOW
    private String estimatedScoreImprovement; // e.g. "+5 to +10 pts"
    private String guidelineReference;        // e.g. "WCAG 2.1 SC 1.1.1", "Google Search Central"
}

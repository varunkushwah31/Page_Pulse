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
    private String category;    // SEO, ACCESSIBILITY, CONTENT, PERFORMANCE
    private String issue;       // Problem description
    private String title;       // Human-readable title
    private String codeSnippet; // Copyable HTML/meta code snippet
    private String explanation; // Explanation / implementation guidance
    private String impactLevel; // HIGH, MEDIUM, LOW
}

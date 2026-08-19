package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentMetrics {
    @Builder.Default
    private Map<String, Integer> headingCounts = new HashMap<>(); // h1, h2, h3, h4, h5, h6
    private int wordCount;
    private int characterCount;
    private int estimatedReadingTimeMinutes;
    private int paragraphCount;
    private double textToHtmlRatioPercentage;

    private ReadabilityMetrics readabilityMetrics;
    
    @Builder.Default
    private List<HeadingNode> headingHierarchy = new ArrayList<>();
    
    @Builder.Default
    private List<String> headingIssues = new ArrayList<>();
    private boolean hasValidHeadingHierarchy;
    
    @Builder.Default
    private List<String> duplicateHeadingTexts = new ArrayList<>();

    @Builder.Default
    private List<KeywordPhrase> topKeywords = new ArrayList<>();
    private boolean hasKeywordStuffing;
    private boolean isThinContent; // < 300 words

    private double contentLinkDensityPercentage;
    
    @Builder.Default
    private List<String> genericAnchorWarnings = new ArrayList<>();
}

package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentMetrics {
    private Map<String, Integer> headingCounts; // h1, h2, h3, h4, h5, h6
    private int wordCount;
    private int estimatedReadingTimeMinutes;
    private int paragraphCount;
    private double textToHtmlRatioPercentage;
}

package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KeywordGapResponse {
    private String urlA;
    private String urlB;
    private int totalKeywordsUrlA;
    private int totalKeywordsUrlB;
    private List<KeywordFrequency> sharedKeywords;
    private List<KeywordFrequency> uniqueTargetKeywords;
    private List<KeywordFrequency> missingCompetitorOpportunities;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KeywordFrequency {
        private String keyword;
        private int countUrlA;
        private int countUrlB;
        private double densityUrlA;
        private double densityUrlB;
        private String gapType; // SHARED, UNIQUE_TARGET, MISSING_OPPORTUNITY
    }
}

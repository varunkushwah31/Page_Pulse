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
public class SitemapDeltaResponse {

    private String sitemapUrl;
    private Instant currentCrawlTimestamp;
    private Instant previousCrawlTimestamp;

    private List<String> newPages;
    private List<String> removedPages;
    private List<ScoreRegressionItem> scoreRegressions;
    private List<ScoreImprovementItem> scoreImprovements;
    private int unchangedCount;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreRegressionItem {
        private String url;
        private int previousScore;
        private int currentScore;
        private int scoreDrop;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreImprovementItem {
        private String url;
        private int previousScore;
        private int currentScore;
        private int scoreGain;
    }
}

package com.pulse.page.web.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "sitemap_snapshots")
public class SitemapSnapshot {

    @Id
    private String id;

    private String sitemapUrl;

    private String domain;

    private int totalUrls;

    private double averageScore;

    // Map of URL -> overallScore
    private Map<String, Integer> urlScores;

    @Builder.Default
    private Instant crawlTimestamp = Instant.now();
}

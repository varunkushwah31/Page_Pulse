package com.pulse.page.web.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "sitemap_snapshots")
@CompoundIndexes({
    @CompoundIndex(name = "sitemap_crawl_idx", def = "{'sitemapUrl': 1, 'crawlTimestamp': -1}")
})
public class SitemapSnapshot {

    @Id
    private String id;

    @Indexed
    private String sitemapUrl;

    @Indexed
    private String domain;

    private int totalUrls;

    private double averageScore;

    // Map of URL -> overallScore
    private Map<String, Integer> urlScores;

    @Builder.Default
    private Instant crawlTimestamp = Instant.now();
}

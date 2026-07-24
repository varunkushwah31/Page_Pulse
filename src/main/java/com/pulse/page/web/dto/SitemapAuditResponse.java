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
public class SitemapAuditResponse {
    private String sitemapUrl;
    private int totalUrlsAudited;
    private double averageOverallScore;
    private List<AuditResponse> childAudits;

    @Builder.Default
    private Instant timestamp = Instant.now();
}

package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlatformStatsResponse {
    private long totalTransientAuditsRun;
    private long totalSavedReports;
    private double averageOverallScore;
    private double averageResponseTimeMs;
    private Map<String, Long> topDomains;
}

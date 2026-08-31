package com.pulse.page.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiExecutiveSummaryDto {
    private boolean success;
    private String model;
    private String overallHealthStatus;
    private String executiveHeadline;
    private List<String> topStrengths;
    private List<String> topQuickWins;
    private List<String> criticalRedFlags;
    private String competitorRankingAngle;
    private String error;
}

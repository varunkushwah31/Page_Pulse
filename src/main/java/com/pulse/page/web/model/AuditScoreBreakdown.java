package com.pulse.page.web.model;

import com.pulse.page.web.enums.HealthGrade;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditScoreBreakdown {
    private int seoScore;
    private int contentScore;
    private int accessibilityScore;
    private int performanceScore;
    private int overallScore;
    private HealthGrade healthGrade;
}

package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoreWebVitals {
    private long lcpMs;      // Largest Contentful Paint (ms)
    private long inpMs;      // Interaction to Next Paint (ms)
    private double clsRatio; // Cumulative Layout Shift (ratio e.g. 0.05)
    private long fcpMs;      // First Contentful Paint (ms)
    private long ttfbMs;     // Time to First Byte (ms)
    private String overallGrade; // GOOD, NEEDS_IMPROVEMENT, POOR

    @Builder.Default
    private boolean cruxDataAvailable = false; // true if data came from CrUX API

    @Builder.Default
    private String dataSource = "LAB_ESTIMATED"; // "CRUX_FIELD" or "LAB_ESTIMATED"
}

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
public class TrendResponse {

    private String domain;
    private String metric;
    private Instant from;
    private Instant to;
    private int dataPoints;
    private List<DataPoint> data;
    private Summary summary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DataPoint {
        private Instant timestamp;
        private Double value;
        private Long auditId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Double min;
        private Double max;
        private Double average;
        private Double latest;
        private Double previous;
        private Double change;
        private Double changePercent;
        private String trend;
    }
}
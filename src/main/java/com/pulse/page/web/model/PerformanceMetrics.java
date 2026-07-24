package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerformanceMetrics {
    private int statusCode;
    private long responseTimeMs;
    private String contentType;
    private boolean isSecureSsl;
    private int scriptResourceCount;
    private int stylesheetResourceCount;
    private int imageResourceCount;
}

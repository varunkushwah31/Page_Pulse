package com.pulse.page.web.dto;

import java.time.Instant;
import java.util.List;

public record AuditReportResponse(
    String url,
    int httpStatus,
    long responseTimeMs,
    String pageTitle,
    String metaDescription,
    int h1Count,
    int imagesMissingAltCount,
    List<String> imagesMissingAltDetails,
    int approximateWordCount,
    String contentType,
    boolean success,
    String errorMessage,
    Instant timestamp
) {
    public static AuditReportResponse failure(String url, int httpStatus, long responseTimeMs, String errorMessage) {
        return new AuditReportResponse(
            url,
            httpStatus,
            responseTimeMs,
            null,
            null,
            0,
            0,
            List.of(),
            0,
            null,
            false,
            errorMessage,
            Instant.now()
        );
    }
}

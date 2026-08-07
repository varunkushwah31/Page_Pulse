package com.pulse.page.web.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ErrorResponse(
    Instant timestamp,
    int status,
    String error,
    String message,
    String path,
    String traceId,
    Map<String, String> details
) {
    public ErrorResponse(Instant timestamp, int status, String error, String message, String path, String traceId) {
        this(timestamp, status, error, message, path, traceId, Collections.emptyMap());
    }
}

package com.pulse.page.web.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledAuditRequest {

    @NotEmpty(message = "URL is required")
    private String url;

    private String webhookUrl;

    private String email;

    @NotNull(message = "Frequency in minutes is required")
    private Integer frequencyMinutes;

    @Builder.Default
    private Integer regressionThreshold = 15;

    @Builder.Default
    private Boolean notifyOnRegressionOnly = true;
}
package com.pulse.page.web.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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

    private Integer regressionThreshold;

    private Boolean notifyOnRegressionOnly;
}
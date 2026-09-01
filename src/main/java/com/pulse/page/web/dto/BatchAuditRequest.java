package com.pulse.page.web.dto;

import jakarta.validation.constraints.NotEmpty;
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
public class BatchAuditRequest {

    @NotEmpty(message = "At least one URL is required")
    @Size(max = 50, message = "Maximum 50 URLs per batch")
    private List<String> urls;

    private String webhookUrl;
    private String correlationId;
    @Builder.Default
    private boolean enableJsRendering = false;
}
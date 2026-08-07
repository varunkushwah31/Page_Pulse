package com.pulse.page.web.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditRequest {

    @NotBlank(message = "URL parameter must not be empty or blank.")
    @JsonProperty("url")
    private String url;

    @JsonProperty("enableJsRendering")
    @Builder.Default
    private Boolean enableJsRendering = false;

    public boolean isEnableJsRendering() {
        return Boolean.TRUE.equals(enableJsRendering);
    }
}

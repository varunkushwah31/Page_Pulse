package com.pulse.page.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiSchemaGenerationResponse {
    private boolean success;
    private String model;
    private String detectedType;
    private String jsonLdScript;
    private String explanation;
    private String validationNotes;
    private String error;
}

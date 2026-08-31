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
public class GeminiModelDto {
    private String id;
    private String name;
    private String displayName;
    private String description;
    private int inputTokenLimit;
    private int outputTokenLimit;
    private boolean supportsGenerateContent;
    private boolean isRecommended;
}
package com.pulse.page.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSeoCollectionItemRequest {

    @NotBlank(message = "Item name is required")
    @Size(max = 150, message = "Name must not exceed 150 characters")
    private String name;

    @NotBlank(message = "URL is required")
    private String url;

    private String method;

    private Boolean enableJsRendering;

    private Integer expectedMinScore;

    private Integer maxResponseTimeMs;

    private Map<String, String> customHeaders;

    private List<String> tags;
}

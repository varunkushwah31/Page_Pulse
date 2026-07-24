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
public class CompetitorComparisonRequest {

    @NotEmpty(message = "At least one URL is required")
    @Size(max = 10, message = "Maximum 10 competitors per comparison")
    private List<String> urls;

    private String correlationId;
}
package com.pulse.page.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeminiCustomPromptRequest {
    @NotNull(message = "Audit payload is required")
    private AuditResponse audit;

    @NotBlank(message = "Prompt must not be blank")
    private String prompt;
}

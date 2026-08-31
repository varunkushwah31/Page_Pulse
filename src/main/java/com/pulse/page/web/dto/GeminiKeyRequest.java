package com.pulse.page.web.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeminiKeyRequest {
    @Size(max = 255, message = "API Key must not exceed 255 characters")
    private String apiKey;
}

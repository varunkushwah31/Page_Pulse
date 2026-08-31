package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeminiCustomPromptResponse {
    private String response;
    private String model;
    private boolean success;
    private String error;
}

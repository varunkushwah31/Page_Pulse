package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSchemaGenerationRequest {
    private AuditResponse audit;
    private String schemaType;
    private UserAiPreferencesRequest preferences;
}

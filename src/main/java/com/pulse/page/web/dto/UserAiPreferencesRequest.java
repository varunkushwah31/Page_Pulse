package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAiPreferencesRequest {
    private String targetNiche;
    private String brandTone;
    private String targetCountry;
    private String primaryObjective;
    private String aiCreativityLevel;
    private String preferredAiModel;
}

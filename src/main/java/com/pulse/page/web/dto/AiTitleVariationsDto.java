package com.pulse.page.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiTitleVariationsDto {
    private boolean success;
    private String model;
    private List<TitleMetaOption> variations;
    private String error;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TitleMetaOption {
        private String angle;
        private String title;
        private int titleLength;
        private String metaDescription;
        private int descriptionLength;
        private String rationale;
        private String estimatedCtrLift;
    }
}

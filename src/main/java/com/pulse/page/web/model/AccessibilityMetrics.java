package com.pulse.page.web.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AccessibilityMetrics {
    private int totalImageCount;
    private int imagesMissingAltCount;
    @Builder.Default
    private List<String> imagesMissingAltUrls = new ArrayList<>();
    
    private boolean hasHtmlLangAttribute;
    private String htmlLangValue;
    private boolean validLangCode;
    
    private int formInputsMissingLabelsCount;
    private int buttonsMissingAccessibleNameCount;
    private int linksMissingAccessibleTextCount;
    
    private boolean hasMainLandmark;
    private boolean hasHeaderLandmark;
    private boolean hasNavLandmark;
    private boolean hasFooterLandmark;
    
    private int positiveTabindexCount; // anti-pattern if > 0
    private int mediaMissingCaptionsCount;
    
    private boolean hasTextDirection;
    private String textDirectionValue;
    
    @Builder.Default
    private List<String> wcagViolationsSummary = new ArrayList<>();

    @Builder.Default
    private List<DomIssueSnippet> domIssues = new ArrayList<>();
}

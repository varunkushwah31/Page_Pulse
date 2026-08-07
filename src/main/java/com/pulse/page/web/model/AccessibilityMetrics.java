package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessibilityMetrics {
    private int totalImageCount;
    private int imagesMissingAltCount;
    private List<String> imagesMissingAltUrls;
    private boolean hasHtmlLangAttribute;
    private String htmlLangValue;
    private int formInputsMissingLabelsCount;

    @Builder.Default
    private List<DomIssueSnippet> domIssues = new java.util.ArrayList<>();
}

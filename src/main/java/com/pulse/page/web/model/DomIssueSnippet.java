package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DomIssueSnippet {
    private String elementType;   // IMG, INPUT, LINK, META
    private String issueType;     // MISSING_ALT, MISSING_LABEL, BROKEN_CANONICAL, MISSING_DESCRIPTION, MISSING_TITLE
    private String outerHtml;     // Full outer HTML of the problematic element
    private String selector;      // CSS selector path for the element
    private int lineHint;         // Approximate line number in source document
}

package com.pulse.page.web.model;

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
public class HeadingNode {
    private String tag; // h1, h2, h3, etc.
    private int level; // 1, 2, 3, etc.
    private String text;
    private int estimatedLine;
    
    @Builder.Default
    private List<String> issues = new ArrayList<>(); // e.g. "SKIPPED_LEVEL", "EMPTY_HEADING", "DUPLICATE_TEXT"
}

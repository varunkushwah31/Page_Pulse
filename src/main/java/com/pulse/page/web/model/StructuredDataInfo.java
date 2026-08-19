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
public class StructuredDataInfo {
    private boolean hasStructuredData;
    private int totalSchemasFound;
    private boolean validJsonLd;
    
    @Builder.Default
    private List<String> detectedSchemaTypes = new ArrayList<>();
    
    @Builder.Default
    private List<String> validationErrors = new ArrayList<>();
    
    @Builder.Default
    private List<String> missingRecommendedProperties = new ArrayList<>();
    
    @Builder.Default
    private List<String> rawJsonLdSnippets = new ArrayList<>();
}

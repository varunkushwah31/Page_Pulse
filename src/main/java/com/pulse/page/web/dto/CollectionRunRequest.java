package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionRunRequest {
    private List<String> itemIds; // Optional, run all if null/empty
    @Builder.Default
    private boolean concurrent = true;
    private Boolean enableJsRenderingOverride; // Optional global override
}

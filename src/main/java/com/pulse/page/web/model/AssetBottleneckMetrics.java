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
public class AssetBottleneckMetrics {
    private int renderBlockingFontsCount;
    private int unSizedImagesCount;
    private long estimatedUnminifiedCssBytes;
    private long estimatedUnminifiedJsBytes;
    private long totalBlockingTimeMs;
    private List<String> bottleneckIssues;
}

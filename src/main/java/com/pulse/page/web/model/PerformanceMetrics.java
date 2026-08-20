package com.pulse.page.web.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PerformanceMetrics {
    private int statusCode;
    private long responseTimeMs;
    private String contentType;
    private boolean isSecureSsl;

    private int scriptResourceCount;
    private int stylesheetResourceCount;
    private int imageResourceCount;
    private int fontResourceCount;

    private int renderBlockingHeadScriptsCount;
    private int asyncOrDeferScriptsCount;

    private int modernImageFormatsCount; // webp, avif, svg
    private int legacyImageFormatsCount; // png, jpg, jpeg, gif, bmp
    private double modernImageRatioPercentage;

    private int resourceHintsCount; // preload, preconnect, dns-prefetch
    private int totalDomNodesCount;
    private int maxDomDepth;

    private String contentEncoding; // gzip, br, etc.
    private String cacheControlHeader;
    private boolean hasCompression;
    private boolean hasBrowserCaching;
}

package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionExportDto {
    @Builder.Default
    private String schema = "https://schema.pagepulse.dev/v1/collection.json";
    @Builder.Default
    private String exporter = "Page Pulse (Postman for SEO) v1.0.0";
    private String name;
    private String description;
    private String color;
    private String icon;
    private List<String> tags;
    private Instant exportedAt;
    private List<ExportItem> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExportItem {
        private String name;
        private String url;
        private String method;
        private boolean enableJsRendering;
        private int expectedMinScore;
        private int maxResponseTimeMs;
        private Map<String, String> customHeaders;
        private List<String> tags;
    }
}

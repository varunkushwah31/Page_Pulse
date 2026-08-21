package com.pulse.page.web.dto;

import com.pulse.page.web.document.SeoCollectionDocument;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeoCollectionDto {
    private String id;
    private Long userId;
    private String username;
    private String name;
    private String description;
    private String color;
    private String icon;
    private List<String> tags;
    private List<SeoCollectionDocument.SeoCollectionItem> items;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant lastRunAt;
    private Double averageScore;
    private int totalItems;
    private int passedItems;
    private int failedItems;

    public static SeoCollectionDto fromDocument(SeoCollectionDocument doc) {
        if (doc == null) return null;

        List<SeoCollectionDocument.SeoCollectionItem> items = doc.getItems() != null ? doc.getItems() : new ArrayList<>();
        int passed = 0;
        int failed = 0;
        double sum = 0;
        int scoredCount = 0;

        for (SeoCollectionDocument.SeoCollectionItem item : items) {
            if (item.getLastAudit() != null && item.getLastAudit().getOverallScore() != null) {
                scoredCount++;
                sum += item.getLastAudit().getOverallScore();
                if ("PASSED".equalsIgnoreCase(item.getLastAudit().getStatus())) {
                    passed++;
                } else if ("FAILED".equalsIgnoreCase(item.getLastAudit().getStatus())) {
                    failed++;
                }
            }
        }

        Double avg = scoredCount > 0 ? Math.round((sum / scoredCount) * 10.0) / 10.0 : doc.getAverageScore();

        return SeoCollectionDto.builder()
                .id(doc.getId())
                .userId(doc.getUserId())
                .username(doc.getUsername())
                .name(doc.getName())
                .description(doc.getDescription())
                .color(doc.getColor())
                .icon(doc.getIcon())
                .tags(doc.getTags() != null ? doc.getTags() : new ArrayList<>())
                .items(items)
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .lastRunAt(doc.getLastRunAt())
                .averageScore(avg)
                .totalItems(items.size())
                .passedItems(passed)
                .failedItems(failed)
                .build();
    }
}

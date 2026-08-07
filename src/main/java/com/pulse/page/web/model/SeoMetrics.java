package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeoMetrics {
    private String pageTitle;
    private int titleLength;
    private boolean hasTitle;

    private String metaDescription;
    private int descriptionLength;
    private boolean hasMetaDescription;

    private String metaKeywords;
    private String canonicalUrl;

    private Map<String, String> openGraphTags;
    private Map<String, String> twitterCardTags;

    private boolean isIndexable;
    private boolean isFollowable;
    private String robotsDirective;

    private boolean hasFavicon;
    private boolean hasViewportMeta;
    private boolean hasOgImage;
    private boolean hasStructuredData;
    private java.util.List<String> seoRecommendations;

    @Builder.Default
    private List<DomIssueSnippet> domIssues = new java.util.ArrayList<>();
}

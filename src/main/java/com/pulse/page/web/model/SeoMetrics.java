package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}

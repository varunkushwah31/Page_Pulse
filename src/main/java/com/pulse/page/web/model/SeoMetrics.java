package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
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
    private String canonicalStatus; // "SELF_REFERENCING", "CROSS_DOMAIN", "RELATIVE_URL", "MISSING", "MULTIPLE_CONFLICTING"

    @Builder.Default
    private Map<String, String> openGraphTags = new HashMap<>();
    @Builder.Default
    private Map<String, String> twitterCardTags = new HashMap<>();
    private boolean openGraphComplete;
    private boolean twitterCardComplete;

    private boolean isIndexable;
    private boolean isFollowable;
    private String robotsDirective;
    private String xRobotsTagHeader;

    private boolean hasFavicon;
    private boolean hasViewportMeta;
    private boolean hasOgImage;
    private boolean hasStructuredData;

    @Builder.Default
    private Map<String, String> hreflangTags = new HashMap<>();
    private boolean hasXDefaultHreflang;
    @Builder.Default
    private List<String> invalidHreflangCodes = new ArrayList<>();

    private StructuredDataInfo structuredDataInfo;
    private SerpPreview serpPreview;

    private String charset;
    private boolean hasAuthor;
    private String author;
    private String socialCardPreviewImage;

    @Builder.Default
    private List<String> seoRecommendations = new ArrayList<>();

    @Builder.Default
    private List<DomIssueSnippet> domIssues = new ArrayList<>();
}

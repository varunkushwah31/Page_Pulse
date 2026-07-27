package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.SeoMetrics;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class SeoMetricsExtractor {

    private static final String ATTR_PROPERTY = "property";
    private static final String ATTR_CONTENT = "content";

    public SeoMetrics extract(Document doc) {
        String title = extractTitle(doc);
        String description = extractMetaDescription(doc);
        String keywords = extractMetaKeywords(doc);
        String canonical = extractCanonicalUrl(doc);

        Map<String, String> ogTags = extractMetaPrefixMap(doc, "meta[property^=og:]", ATTR_PROPERTY);
        Map<String, String> twitterTags = extractMetaPrefixMap(doc, "meta[name^=twitter:], meta[property^=twitter:]", "name");

        String robots = extractMetaRobots(doc);
        boolean isIndexable = robots == null || !robots.toLowerCase().contains("noindex");
        boolean isFollowable = robots == null || !robots.toLowerCase().contains("nofollow");

        boolean hasFavicon = doc.selectFirst("link[rel*=icon]") != null;
        boolean hasViewportMeta = doc.selectFirst("meta[name=viewport]") != null;
        boolean hasOgImage = ogTags.containsKey("og:image") || twitterTags.containsKey("twitter:image");
        boolean hasStructuredData = doc.selectFirst("script[type=application/ld+json], [itemscope]") != null;

        java.util.List<String> recommendations = buildRecommendations(
            title, description, canonical, hasOgImage, hasFavicon, hasViewportMeta, hasStructuredData, isIndexable
        );

        return SeoMetrics.builder()
            .pageTitle(title)
            .titleLength(title != null ? title.length() : 0)
            .hasTitle(title != null && !title.isBlank())
            .metaDescription(description)
            .descriptionLength(description != null ? description.length() : 0)
            .hasMetaDescription(description != null && !description.isBlank())
            .metaKeywords(keywords)
            .canonicalUrl(canonical)
            .openGraphTags(ogTags)
            .twitterCardTags(twitterTags)
            .isIndexable(isIndexable)
            .isFollowable(isFollowable)
            .robotsDirective(robots)
            .hasFavicon(hasFavicon)
            .hasViewportMeta(hasViewportMeta)
            .hasOgImage(hasOgImage)
            .hasStructuredData(hasStructuredData)
            .seoRecommendations(recommendations)
            .build();
    }

    private java.util.List<String> buildRecommendations(
            String title, String description, String canonical,
            boolean hasOgImage, boolean hasFavicon, boolean hasViewportMeta, boolean hasStructuredData, boolean isIndexable) {
        java.util.List<String> recs = new java.util.ArrayList<>();

        if (title == null || title.isBlank()) {
            recs.add("Add a concise <title> tag summarizing the page (30–60 characters).");
        } else if (title.length() < 30 || title.length() > 60) {
            recs.add("Optimize title tag length (currently " + title.length() + " chars; recommended: 30–60 characters).");
        }

        if (description == null || description.isBlank()) {
            recs.add("Add a <meta name=\"description\"> tag to summarize content for search snippets.");
        } else if (description.length() < 120 || description.length() > 160) {
            recs.add("Optimize meta description length (currently " + description.length() + " chars; recommended: 120–160 characters).");
        }

        if (canonical == null) {
            recs.add("Specify a <link rel=\"canonical\"> tag to eliminate duplicate content issues.");
        }

        if (!hasOgImage) {
            recs.add("Add an <meta property=\"og:image\"> tag for rich social media preview thumbnails.");
        }

        if (!hasFavicon) {
            recs.add("Include a <link rel=\"icon\"> tag for browser tab branding.");
        }

        if (!hasViewportMeta) {
            recs.add("Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> for mobile responsiveness and indexing.");
        }

        if (!hasStructuredData) {
            recs.add("Implement Schema.org JSON-LD structured data (<script type=\"application/ld+json\">) for rich search snippets.");
        }

        if (!isIndexable) {
            recs.add("Robots meta tag currently specifies noindex, preventing search engines from indexing this page.");
        }

        return recs;
    }

    private String extractTitle(Document doc) {
        String title = doc.title();
        if (title != null && !title.isBlank()) {
            return title.trim();
        }
        Element titleEl = doc.selectFirst("title");
        return (titleEl != null && !titleEl.text().isBlank()) ? titleEl.text().trim() : null;
    }

    private String extractMetaDescription(Document doc) {
        Element meta = doc.selectFirst("meta[name=description], meta[name=Description], meta[property=og:description]");
        if (meta == null) {
            for (Element el : doc.select("meta")) {
                if ("description".equalsIgnoreCase(el.attr("name")) || "og:description".equalsIgnoreCase(el.attr(ATTR_PROPERTY))) {
                    meta = el;
                    break;
                }
            }
        }
        if (meta != null && meta.hasAttr(ATTR_CONTENT) && !meta.attr(ATTR_CONTENT).isBlank()) {
            return meta.attr(ATTR_CONTENT).trim();
        }
        return null;
    }

    private String extractMetaKeywords(Document doc) {
        Element meta = doc.selectFirst("meta[name=keywords], meta[name=Keywords]");
        if (meta == null) {
            for (Element el : doc.select("meta")) {
                if ("keywords".equalsIgnoreCase(el.attr("name"))) {
                    meta = el;
                    break;
                }
            }
        }
        if (meta != null && meta.hasAttr(ATTR_CONTENT) && !meta.attr(ATTR_CONTENT).isBlank()) {
            return meta.attr(ATTR_CONTENT).trim();
        }
        return null;
    }

    private String extractCanonicalUrl(Document doc) {
        Element canonical = doc.selectFirst("link[rel=canonical], link[rel=Canonical]");
        if (canonical != null && canonical.hasAttr("href") && !canonical.attr("href").isBlank()) {
            return canonical.attr("href").trim();
        }
        return null;
    }

    private String extractMetaRobots(Document doc) {
        Element meta = doc.selectFirst("meta[name=robots], meta[name=Robots]");
        if (meta == null) {
            for (Element el : doc.select("meta")) {
                if ("robots".equalsIgnoreCase(el.attr("name"))) {
                    meta = el;
                    break;
                }
            }
        }
        if (meta != null && meta.hasAttr(ATTR_CONTENT) && !meta.attr(ATTR_CONTENT).isBlank()) {
            return meta.attr(ATTR_CONTENT).trim();
        }
        return null;
    }

    private Map<String, String> extractMetaPrefixMap(Document doc, String cssQuery, String keyAttr) {
        Map<String, String> map = new HashMap<>();
        Elements elements = doc.select(cssQuery);
        for (Element el : elements) {
            String key = el.hasAttr(keyAttr) ? el.attr(keyAttr) : el.attr(ATTR_PROPERTY);
            String content = el.attr(ATTR_CONTENT);
            if (!key.isBlank() && !content.isBlank()) {
                map.put(key, content);
            }
        }
        return map;
    }
}

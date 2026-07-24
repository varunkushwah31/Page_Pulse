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

    public SeoMetrics extract(Document doc) {
        String title = extractTitle(doc);
        String description = extractMetaDescription(doc);
        String keywords = extractMetaKeywords(doc);
        String canonical = extractCanonicalUrl(doc);

        Map<String, String> ogTags = extractMetaPrefixMap(doc, "meta[property^=og:]", "property");
        Map<String, String> twitterTags = extractMetaPrefixMap(doc, "meta[name^=twitter:], meta[property^=twitter:]", "name");

        String robots = extractMetaRobots(doc);
        boolean isIndexable = robots == null || !robots.toLowerCase().contains("noindex");
        boolean isFollowable = robots == null || !robots.toLowerCase().contains("nofollow");

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
            .build();
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
                if ("description".equalsIgnoreCase(el.attr("name")) || "og:description".equalsIgnoreCase(el.attr("property"))) {
                    meta = el;
                    break;
                }
            }
        }
        if (meta != null && meta.hasAttr("content") && !meta.attr("content").isBlank()) {
            return meta.attr("content").trim();
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
        if (meta != null && meta.hasAttr("content") && !meta.attr("content").isBlank()) {
            return meta.attr("content").trim();
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
        if (meta != null && meta.hasAttr("content") && !meta.attr("content").isBlank()) {
            return meta.attr("content").trim();
        }
        return null;
    }

    private Map<String, String> extractMetaPrefixMap(Document doc, String cssQuery, String keyAttr) {
        Map<String, String> map = new HashMap<>();
        Elements elements = doc.select(cssQuery);
        for (Element el : elements) {
            String key = el.hasAttr(keyAttr) ? el.attr(keyAttr) : el.attr("property");
            String content = el.attr("content");
            if (!key.isBlank() && !content.isBlank()) {
                map.put(key, content);
            }
        }
        return map;
    }
}

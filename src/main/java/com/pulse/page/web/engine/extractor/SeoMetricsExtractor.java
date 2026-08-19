package com.pulse.page.web.engine.extractor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulse.page.web.model.DomIssueSnippet;
import com.pulse.page.web.model.SeoMetrics;
import com.pulse.page.web.model.SerpPreview;
import com.pulse.page.web.model.StructuredDataInfo;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@Component
public class SeoMetricsExtractor {

    private static final String ATTR_PROPERTY = "property";
    private static final String ATTR_CONTENT = "content";
    private static final int MAX_SNIPPET_LENGTH = 500;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final Pattern ISO_LANG_PATTERN = Pattern.compile("^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$", Pattern.CASE_INSENSITIVE);

    public SeoMetrics extract(Document doc) {
        return extract(doc, null, null);
    }

    public SeoMetrics extract(Document doc, String targetUrl, Map<String, String> responseHeaders) {
        if (doc == null) {
            return SeoMetrics.builder()
                    .openGraphTags(Collections.emptyMap())
                    .twitterCardTags(Collections.emptyMap())
                    .hreflangTags(Collections.emptyMap())
                    .invalidHreflangCodes(Collections.emptyList())
                    .seoRecommendations(Collections.emptyList())
                    .domIssues(Collections.emptyList())
                    .structuredDataInfo(StructuredDataInfo.builder().build())
                    .build();
        }

        String title = extractTitle(doc);
        String description = extractMetaDescription(doc);
        String keywords = extractMetaKeywords(doc);
        String canonical = extractCanonicalUrl(doc);
        String charset = extractCharset(doc);
        String author = extractAuthor(doc);

        Elements canonicalElements = doc.select("link[rel~=canonical i]");
        String canonicalStatus = determineCanonicalStatus(canonicalElements, canonical, targetUrl);

        Map<String, String> ogTags = extractMetaPrefixMap(doc, "meta[property^=og:], meta[name^=og:]", ATTR_PROPERTY);
        Map<String, String> twitterTags = extractMetaPrefixMap(doc, "meta[name^=twitter:], meta[property^=twitter:]", "name");

        boolean openGraphComplete = checkOpenGraphCompleteness(ogTags);
        boolean twitterCardComplete = checkTwitterCardCompleteness(twitterTags);

        String xRobotsHeader = extractXRobotsHeader(responseHeaders);
        String robotsMeta = extractMetaRobots(doc);
        String combinedRobots = buildCombinedRobotsDirective(robotsMeta, xRobotsHeader);

        boolean isIndexable = combinedRobots == null || !combinedRobots.toLowerCase().contains("noindex");
        boolean isFollowable = combinedRobots == null || !combinedRobots.toLowerCase().contains("nofollow");

        boolean hasFavicon = doc.selectFirst("link[rel*=icon]") != null;
        boolean hasViewportMeta = doc.selectFirst("meta[name=viewport]") != null;
        boolean hasOgImage = ogTags.containsKey("og:image") || twitterTags.containsKey("twitter:image");

        String socialPreviewImg = ogTags.getOrDefault("og:image", twitterTags.get("twitter:image"));

        // Hreflang extraction & validation
        Map<String, String> hreflangMap = new HashMap<>();
        List<String> invalidHreflang = new ArrayList<>();
        boolean hasXDefault = false;

        Elements hreflangElements = doc.select("link[rel=alternate][hreflang]");
        for (Element el : hreflangElements) {
            String langCode = el.attr("hreflang").trim();
            String href = el.attr("abs:href").isBlank() ? el.attr("href").trim() : el.attr("abs:href").trim();
            if (!langCode.isBlank() && !href.isBlank()) {
                hreflangMap.put(langCode, href);
                if ("x-default".equalsIgnoreCase(langCode)) {
                    hasXDefault = true;
                } else if (!ISO_LANG_PATTERN.matcher(langCode).matches()) {
                    invalidHreflang.add(langCode);
                }
            }
        }

        // Structured Data & Schema.org Deep Inspection
        StructuredDataInfo structuredDataInfo = inspectStructuredData(doc);
        boolean hasStructuredData = structuredDataInfo.isHasStructuredData();

        // SERP Simulator
        SerpPreview serpPreview = generateSerpPreview(title, description, targetUrl);

        // Visual Inspector DOM Issues
        List<DomIssueSnippet> domIssues = collectSeoIssueSnippets(doc, title, description, canonical, canonicalElements);

        // Comprehensive Recommendations
        List<String> recommendations = buildComprehensiveRecommendations(
                title, description, canonical, canonicalStatus, hasOgImage, openGraphComplete,
                twitterCardComplete, hasFavicon, hasViewportMeta, structuredDataInfo, isIndexable,
                hreflangElements.size(), invalidHreflang
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
                .canonicalStatus(canonicalStatus)
                .openGraphTags(ogTags)
                .twitterCardTags(twitterTags)
                .openGraphComplete(openGraphComplete)
                .twitterCardComplete(twitterCardComplete)
                .isIndexable(isIndexable)
                .isFollowable(isFollowable)
                .robotsDirective(combinedRobots)
                .xRobotsTagHeader(xRobotsHeader)
                .hasFavicon(hasFavicon)
                .hasViewportMeta(hasViewportMeta)
                .hasOgImage(hasOgImage)
                .hasStructuredData(hasStructuredData)
                .hreflangTags(hreflangMap)
                .hasXDefaultHreflang(hasXDefault)
                .invalidHreflangCodes(invalidHreflang)
                .structuredDataInfo(structuredDataInfo)
                .serpPreview(serpPreview)
                .charset(charset)
                .hasAuthor(author != null && !author.isBlank())
                .author(author)
                .socialCardPreviewImage(socialPreviewImg)
                .seoRecommendations(recommendations)
                .domIssues(domIssues)
                .build();
    }

    private String determineCanonicalStatus(Elements canonicalElements, String canonical, String targetUrl) {
        if (canonicalElements.size() > 1) {
            return "MULTIPLE_CONFLICTING";
        }
        if (canonical == null || canonical.isBlank()) {
            return "MISSING";
        }
        if (!canonical.startsWith("http://") && !canonical.startsWith("https://")) {
            return "RELATIVE_URL";
        }
        if (targetUrl != null) {
            try {
                URI targetUri = URI.create(targetUrl);
                URI canonUri = URI.create(canonical);
                if (canonUri.getHost() != null && !canonUri.getHost().equalsIgnoreCase(targetUri.getHost())) {
                    return "CROSS_DOMAIN";
                }
                return "SELF_REFERENCING";
            } catch (Exception ignored) {
            }
        }
        return "DECLARED";
    }

    private boolean checkOpenGraphCompleteness(Map<String, String> og) {
        return og.containsKey("og:title") && og.containsKey("og:description") &&
                og.containsKey("og:image") && og.containsKey("og:url");
    }

    private boolean checkTwitterCardCompleteness(Map<String, String> twitter) {
        return (twitter.containsKey("twitter:card") || twitter.containsKey("twitter:card")) &&
                (twitter.containsKey("twitter:title") || twitter.containsKey("twitter:image"));
    }

    private String extractXRobotsHeader(Map<String, String> headers) {
        if (headers == null) return null;
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            if ("x-robots-tag".equalsIgnoreCase(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private String buildCombinedRobotsDirective(String metaRobots, String xRobotsHeader) {
        if (metaRobots == null && xRobotsHeader == null) return null;
        if (metaRobots != null && xRobotsHeader != null) {
            return "Meta: " + metaRobots + " | Header: " + xRobotsHeader;
        }
        return metaRobots != null ? metaRobots : xRobotsHeader;
    }

    private StructuredDataInfo inspectStructuredData(Document doc) {
        List<String> schemaTypes = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        List<String> missingProps = new ArrayList<>();
        List<String> rawSnippets = new ArrayList<>();
        boolean validJson = true;

        Elements jsonLdScripts = doc.select("script[type=application/ld+json]");
        int totalFound = jsonLdScripts.size();

        for (Element script : jsonLdScripts) {
            String jsonContent = script.data().trim();
            if (jsonContent.isBlank()) {
                jsonContent = script.text().trim();
            }
            if (jsonContent.isBlank()) continue;

            rawSnippets.add(truncateHtml(jsonContent));

            try {
                JsonNode root = OBJECT_MAPPER.readTree(jsonContent);
                parseSchemaNode(root, schemaTypes, missingProps);
            } catch (Exception e) {
                validJson = false;
                errors.add("Malformed JSON-LD syntax: " + e.getMessage());
            }
        }

        // Microdata detection
        Elements microdata = doc.select("[itemscope][itemtype]");
        for (Element item : microdata) {
            totalFound++;
            String itemType = item.attr("itemtype");
            if (!itemType.isBlank()) {
                String simpleType = itemType.substring(itemType.lastIndexOf('/') + 1);
                if (!schemaTypes.contains(simpleType)) {
                    schemaTypes.add(simpleType + " (Microdata)");
                }
            }
        }

        return StructuredDataInfo.builder()
                .hasStructuredData(totalFound > 0)
                .totalSchemasFound(totalFound)
                .validJsonLd(validJson)
                .detectedSchemaTypes(schemaTypes)
                .validationErrors(errors)
                .missingRecommendedProperties(missingProps)
                .rawJsonLdSnippets(rawSnippets)
                .build();
    }

    private void parseSchemaNode(JsonNode node, List<String> schemaTypes, List<String> missingProps) {
        if (node == null) return;

        if (node.isArray()) {
            for (JsonNode item : node) {
                parseSchemaNode(item, schemaTypes, missingProps);
            }
            return;
        }

        if (node.has("@graph")) {
            parseSchemaNode(node.get("@graph"), schemaTypes, missingProps);
            return;
        }

        if (node.has("@type")) {
            String type = node.get("@type").asText();
            if (!schemaTypes.contains(type)) {
                schemaTypes.add(type);
            }

            // Check essential properties based on type
            if ("Article".equalsIgnoreCase(type) || "BlogPosting".equalsIgnoreCase(type) || "NewsArticle".equalsIgnoreCase(type)) {
                if (!node.has("headline") && !node.has("name")) missingProps.add(type + " missing 'headline'");
                if (!node.has("author")) missingProps.add(type + " missing 'author'");
                if (!node.has("datePublished")) missingProps.add(type + " missing 'datePublished'");
            } else if ("Product".equalsIgnoreCase(type)) {
                if (!node.has("name")) missingProps.add("Product missing 'name'");
                if (!node.has("offers")) missingProps.add("Product missing 'offers'");
            } else if ("Organization".equalsIgnoreCase(type) || "LocalBusiness".equalsIgnoreCase(type)) {
                if (!node.has("name")) missingProps.add(type + " missing 'name'");
                if (!node.has("url")) missingProps.add(type + " missing 'url'");
            }
        }
    }

    private SerpPreview generateSerpPreview(String title, String description, String targetUrl) {
        String safeTitle = (title != null && !title.isBlank()) ? title.trim() : "Untitled Document";
        String safeDesc = (description != null && !description.isBlank()) ? description.trim() : "No meta description provided.";
        String safeUrl = (targetUrl != null && !targetUrl.isBlank()) ? targetUrl : "https://example.com";

        int titlePixelWidth = (int) Math.round(safeTitle.length() * 9.5);
        int descPixelWidth = (int) Math.round(safeDesc.length() * 5.8);

        boolean titleTruncated = safeTitle.length() > 60 || titlePixelWidth > 600;
        boolean descTruncated = safeDesc.length() > 160 || descPixelWidth > 960;

        String displayTitle = titleTruncated ? safeTitle.substring(0, Math.min(57, safeTitle.length())) + "..." : safeTitle;
        String displayDesc = descTruncated ? safeDesc.substring(0, Math.min(155, safeDesc.length())) + "..." : safeDesc;

        return SerpPreview.builder()
                .displayedTitle(displayTitle)
                .displayedUrl(safeUrl)
                .displayedDescription(displayDesc)
                .titlePixelWidth(titlePixelWidth)
                .descriptionPixelWidth(descPixelWidth)
                .titleTruncated(titleTruncated)
                .descriptionTruncated(descTruncated)
                .mobilePreviewTitle(titleTruncated ? safeTitle.substring(0, Math.min(52, safeTitle.length())) + "..." : safeTitle)
                .mobilePreviewDescription(descTruncated ? safeDesc.substring(0, Math.min(120, safeDesc.length())) + "..." : safeDesc)
                .build();
    }

    private List<String> buildComprehensiveRecommendations(
            String title, String description, String canonical, String canonicalStatus,
            boolean hasOgImage, boolean openGraphComplete, boolean twitterCardComplete,
            boolean hasFavicon, boolean hasViewportMeta, StructuredDataInfo structuredData,
            boolean isIndexable, int hreflangCount, List<String> invalidHreflang) {

        List<String> recs = new ArrayList<>();

        if (title == null || title.isBlank()) {
            recs.add("Add a descriptive <title> tag between 30 and 60 characters for SERP visibility.");
        } else if (title.length() < 30) {
            recs.add("Page title is short (" + title.length() + " chars). Expand with relevant keywords (optimal: 30–60 chars).");
        } else if (title.length() > 60) {
            recs.add("Page title is long (" + title.length() + " chars). Search engines will truncate it in desktop SERP listings.");
        }

        if (description == null || description.isBlank()) {
            recs.add("Add a <meta name=\"description\"> tag (120–160 chars) summarizing page value to improve organic CTR.");
        } else if (description.length() < 120) {
            recs.add("Meta description is brief (" + description.length() + " chars). Expand to 120–160 chars for rich SERP snippets.");
        } else if (description.length() > 160) {
            recs.add("Meta description exceeds 160 chars (" + description.length() + " chars) and may be truncated on mobile/desktop.");
        }

        if ("MISSING".equals(canonicalStatus)) {
            recs.add("Add a self-referencing <link rel=\"canonical\"> tag to eliminate duplicate content ambiguity.");
        } else if ("MULTIPLE_CONFLICTING".equals(canonicalStatus)) {
            recs.add("CRITICAL: Multiple conflicting <link rel=\"canonical\"> tags detected. Retain only one canonical URL.");
        } else if ("RELATIVE_URL".equals(canonicalStatus)) {
            recs.add("Canonical tag contains a relative URL. Always use absolute HTTPS URLs in canonical links.");
        }

        if (!openGraphComplete) {
            recs.add("Complete OpenGraph suite: declare og:title, og:description, og:image, and og:url for rich social sharing.");
        }
        if (!twitterCardComplete) {
            recs.add("Declare Twitter card tags (twitter:card, twitter:title, twitter:image) for optimized Twitter/X cards.");
        }

        if (!hasViewportMeta) {
            recs.add("Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> for mobile-first indexing.");
        }
        if (!hasFavicon) {
            recs.add("Add high-resolution favicon links (<link rel=\"icon\"> and apple-touch-icon) for brand recognition.");
        }

        if (!structuredData.isHasStructuredData()) {
            recs.add("Implement Schema.org JSON-LD structured data (<script type=\"application/ld+json\">) for rich search snippets.");
        } else if (!structuredData.isValidJsonLd()) {
            recs.add("CRITICAL: JSON-LD structured data contains syntax parsing errors preventing rich search result eligibility.");
        } else if (!structuredData.getMissingRecommendedProperties().isEmpty()) {
            recs.add("Schema.org markup is missing recommended properties: " + String.join(", ", structuredData.getMissingRecommendedProperties()));
        }

        if (!isIndexable) {
            recs.add("WARNING: Page contains a noindex directive in meta tags or HTTP headers, blocking search engine indexing.");
        }

        if (!invalidHreflang.isEmpty()) {
            recs.add("Fix invalid hreflang language/region codes: " + String.join(", ", invalidHreflang));
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
        Element meta = doc.selectFirst("meta[name=description i], meta[property=og:description i]");
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
        Element meta = doc.selectFirst("meta[name=keywords], meta[name=Keywords], meta[name=KEYWORDS]");
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
        Element canonical = doc.selectFirst("link[rel=canonical], link[rel=Canonical], link[rel=CANONICAL]");
        if (canonical == null) {
            for (Element el : doc.select("link")) {
                if ("canonical".equalsIgnoreCase(el.attr("rel"))) {
                    canonical = el;
                    break;
                }
            }
        }
        if (canonical != null && canonical.hasAttr("href") && !canonical.attr("href").isBlank()) {
            String absHref = canonical.attr("abs:href");
            return !absHref.isBlank() ? absHref.trim() : canonical.attr("href").trim();
        }
        return null;
    }

    private String extractMetaRobots(Document doc) {
        Element meta = doc.selectFirst("meta[name=robots], meta[name=Robots], meta[name=ROBOTS], meta[name=googlebot]");
        if (meta == null) {
            for (Element el : doc.select("meta")) {
                if ("robots".equalsIgnoreCase(el.attr("name")) || "googlebot".equalsIgnoreCase(el.attr("name"))) {
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

    private String extractCharset(Document doc) {
        Element meta = doc.selectFirst("meta[charset]");
        if (meta != null && meta.hasAttr("charset") && !meta.attr("charset").isBlank()) {
            return meta.attr("charset").trim();
        }
        for (Element el : doc.select("meta")) {
            if ("content-type".equalsIgnoreCase(el.attr("http-equiv")) && el.hasAttr(ATTR_CONTENT)) {
                String content = el.attr(ATTR_CONTENT);
                if (content.toLowerCase().contains("charset=")) {
                    return content.substring(content.toLowerCase().indexOf("charset=") + 8).trim();
                }
            }
        }
        return "UTF-8";
    }

    private String extractAuthor(Document doc) {
        Element meta = doc.selectFirst("meta[name=author], meta[property=article:author]");
        if (meta == null) {
            for (Element el : doc.select("meta")) {
                if ("author".equalsIgnoreCase(el.attr("name")) || "article:author".equalsIgnoreCase(el.attr(ATTR_PROPERTY))) {
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

    private List<DomIssueSnippet> collectSeoIssueSnippets(
            Document doc, String title, String description, String canonical, Elements canonicalElements) {
        List<DomIssueSnippet> issues = new ArrayList<>();

        if (title == null || title.isBlank()) {
            Element head = doc.selectFirst("head");
            issues.add(DomIssueSnippet.builder()
                    .elementType("META")
                    .issueType("MISSING_TITLE")
                    .outerHtml(head != null ? truncateHtml("<head>...</head> — no <title> tag found") : "<head> element missing")
                    .selector("head > title")
                    .lineHint(0)
                    .build());
        }

        if (description == null || description.isBlank()) {
            issues.add(DomIssueSnippet.builder()
                    .elementType("META")
                    .issueType("MISSING_DESCRIPTION")
                    .outerHtml("<meta name=\"description\" content=\"...\"> — tag not found in <head>")
                    .selector("head > meta[name=description]")
                    .lineHint(0)
                    .build());
        }

        if (canonical == null || canonical.isBlank()) {
            issues.add(DomIssueSnippet.builder()
                    .elementType("LINK")
                    .issueType("BROKEN_CANONICAL")
                    .outerHtml("<link rel=\"canonical\" href=\"...\"> — tag not found in <head>")
                    .selector("head > link[rel=canonical]")
                    .lineHint(0)
                    .build());
        } else if (canonicalElements.size() > 1) {
            issues.add(DomIssueSnippet.builder()
                    .elementType("LINK")
                    .issueType("BROKEN_CANONICAL")
                    .outerHtml("Multiple conflicting canonical tags detected (" + canonicalElements.size() + " tags)")
                    .selector("head > link[rel=canonical]")
                    .lineHint(0)
                    .build());
        }

        return issues;
    }

    private String truncateHtml(String html) {
        if (html == null) return "";
        return html.length() > MAX_SNIPPET_LENGTH ? html.substring(0, MAX_SNIPPET_LENGTH) + "..." : html;
    }
}

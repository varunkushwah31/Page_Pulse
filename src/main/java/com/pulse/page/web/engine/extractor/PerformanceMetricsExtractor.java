package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.model.PerformanceMetrics;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
public class PerformanceMetricsExtractor {

    public PerformanceMetrics extract(ScrapeResult scrapeResult) {
        if (scrapeResult == null) {
            return PerformanceMetrics.builder()
                    .statusCode(500)
                    .responseTimeMs(0)
                    .contentType("text/html")
                    .isSecureSsl(false)
                    .scriptResourceCount(0)
                    .stylesheetResourceCount(0)
                    .imageResourceCount(0)
                    .fontResourceCount(0)
                    .renderBlockingHeadScriptsCount(0)
                    .asyncOrDeferScriptsCount(0)
                    .modernImageFormatsCount(0)
                    .legacyImageFormatsCount(0)
                    .modernImageRatioPercentage(0.0)
                    .resourceHintsCount(0)
                    .totalDomNodesCount(0)
                    .maxDomDepth(0)
                    .contentEncoding("none")
                    .cacheControlHeader(null)
                    .hasCompression(false)
                    .hasBrowserCaching(false)
                    .build();
        }

        Document doc = scrapeResult.getDocument();

        // 1. Script Analysis
        int scriptCount = 0;
        int renderBlockingHeadScripts = 0;
        int asyncOrDeferScripts = 0;

        if (doc != null) {
            Elements scripts = doc.select("script");
            scriptCount = scripts.size();

            Elements headScripts = doc.select("head script[src]");
            for (Element s : headScripts) {
                boolean hasAsync = s.hasAttr("async");
                boolean hasDefer = s.hasAttr("defer");
                boolean isModule = "module".equalsIgnoreCase(s.attr("type"));

                if (!hasAsync && !hasDefer && !isModule) {
                    renderBlockingHeadScripts++;
                } else {
                    asyncOrDeferScripts++;
                }
            }
        }

        // 2. Stylesheets and Fonts
        int stylesheetCount = doc != null ? doc.select("link[rel~=stylesheet i]").size() : 0;
        int fontCount = doc != null ? doc.select("link[rel~=preload i][as=font], link[href*=.woff], link[href*=.woff2], link[href*=.ttf]").size() : 0;

        // 3. Images and Modern Formats
        int totalImages = 0;
        int modernImages = 0;
        int legacyImages = 0;

        if (doc != null) {
            Elements images = doc.select("img[src], source[srcset]");
            totalImages = images.size();

            for (Element img : images) {
                String src = (img.hasAttr("srcset") ? img.attr("srcset") : img.attr("src")).toLowerCase();
                if (src.contains(".webp") || src.contains(".avif") || src.contains(".svg")) {
                    modernImages++;
                } else if (src.contains(".png") || src.contains(".jpg") || src.contains(".jpeg") || src.contains(".gif") || src.contains(".bmp")) {
                    legacyImages++;
                }
            }
        }

        double modernRatio = (modernImages + legacyImages) > 0
                ? ((double) modernImages / (modernImages + legacyImages)) * 100.0
                : 100.0;

        // 4. Resource Hints
        int resourceHints = doc != null
                ? doc.select("link[rel=preload], link[rel=preconnect], link[rel=dns-prefetch], link[rel=prefetch]").size()
                : 0;

        // 5. DOM Complexity
        int totalDomNodes = doc != null ? doc.getAllElements().size() : 0;
        int maxDepth = doc != null ? calculateMaxDomDepth(doc.root()) : 0;

        // 6. Security & HTTP Headers
        boolean isSecure = scrapeResult.getTargetUrl() != null &&
                scrapeResult.getTargetUrl().toLowerCase().startsWith("https://");

        Map<String, String> headers = scrapeResult.getResponseHeaders();
        String contentEncoding = extractHeaderValue(headers, "content-encoding", "none");
        String cacheControl = extractHeaderValue(headers, "cache-control", null);

        boolean hasCompression = contentEncoding != null && !contentEncoding.equalsIgnoreCase("none") &&
                (contentEncoding.contains("gzip") || contentEncoding.contains("br") || contentEncoding.contains("deflate") || contentEncoding.contains("zstd"));

        boolean hasCaching = cacheControl != null && (cacheControl.contains("max-age") || cacheControl.contains("public") || cacheControl.contains("immutable"));

        return PerformanceMetrics.builder()
                .statusCode(scrapeResult.getStatusCode())
                .responseTimeMs(scrapeResult.getResponseTimeMs())
                .contentType(scrapeResult.getContentType() != null ? scrapeResult.getContentType() : "text/html")
                .isSecureSsl(isSecure)
                .scriptResourceCount(scriptCount)
                .stylesheetResourceCount(stylesheetCount)
                .imageResourceCount(totalImages)
                .fontResourceCount(fontCount)
                .renderBlockingHeadScriptsCount(renderBlockingHeadScripts)
                .asyncOrDeferScriptsCount(asyncOrDeferScripts)
                .modernImageFormatsCount(modernImages)
                .legacyImageFormatsCount(legacyImages)
                .modernImageRatioPercentage(Math.round(modernRatio * 10.0) / 10.0)
                .resourceHintsCount(resourceHints)
                .totalDomNodesCount(totalDomNodes)
                .maxDomDepth(maxDepth)
                .contentEncoding(contentEncoding)
                .cacheControlHeader(cacheControl)
                .hasCompression(hasCompression)
                .hasBrowserCaching(hasCaching)
                .build();
    }

    private int calculateMaxDomDepth(Element element) {
        if (element == null) return 0;
        int maxChildDepth = 0;
        for (Element child : element.children()) {
            maxChildDepth = Math.max(maxChildDepth, calculateMaxDomDepth(child));
        }
        return 1 + maxChildDepth;
    }

    private String extractHeaderValue(Map<String, String> headers, String targetKey, String defaultValue) {
        if (headers == null) return defaultValue;
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            if (entry.getKey() != null && entry.getKey().equalsIgnoreCase(targetKey)) {
                return entry.getValue();
            }
        }
        return defaultValue;
    }
}

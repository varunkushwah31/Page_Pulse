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
            return buildDefaultMetrics();
        }

        Document doc = scrapeResult.getDocument();
        ScriptStats scripts = analyzeScripts(doc);
        ImageStats images = analyzeImages(doc);

        int stylesheetCount = doc != null ? doc.select("link[rel~=stylesheet i]").size() : 0;
        int fontCount = doc != null ? doc.select("link[rel~=preload i][as=font], link[href*=.woff], link[href*=.woff2], link[href*=.ttf]").size() : 0;
        int resourceHints = doc != null ? doc.select("link[rel=preload], link[rel=preconnect], link[rel=dns-prefetch], link[rel=prefetch]").size() : 0;
        int totalDomNodes = doc != null ? doc.getAllElements().size() : 0;
        int maxDepth = doc != null ? calculateMaxDomDepth(doc.root()) : 0;

        boolean isSecure = scrapeResult.getTargetUrl() != null &&
                scrapeResult.getTargetUrl().toLowerCase().startsWith("https://");

        Map<String, String> headers = scrapeResult.getResponseHeaders();
        String contentEncoding = extractHeaderValue(headers, "content-encoding", "none");
        String cacheControl = extractHeaderValue(headers, "cache-control", null);

        boolean hasCompression = checkCompression(contentEncoding);
        boolean hasCaching = checkCaching(cacheControl);

        return PerformanceMetrics.builder()
                .statusCode(scrapeResult.getStatusCode())
                .responseTimeMs(scrapeResult.getResponseTimeMs())
                .contentType(scrapeResult.getContentType() != null ? scrapeResult.getContentType() : "text/html")
                .isSecureSsl(isSecure)
                .scriptResourceCount(scripts.scriptCount)
                .stylesheetResourceCount(stylesheetCount)
                .imageResourceCount(images.totalImages)
                .fontResourceCount(fontCount)
                .renderBlockingHeadScriptsCount(scripts.renderBlocking)
                .asyncOrDeferScriptsCount(scripts.asyncOrDefer)
                .modernImageFormatsCount(images.modernImages)
                .legacyImageFormatsCount(images.legacyImages)
                .modernImageRatioPercentage(Math.round(images.modernRatio * 10.0) / 10.0)
                .resourceHintsCount(resourceHints)
                .totalDomNodesCount(totalDomNodes)
                .maxDomDepth(maxDepth)
                .contentEncoding(contentEncoding)
                .cacheControlHeader(cacheControl)
                .hasCompression(hasCompression)
                .hasBrowserCaching(hasCaching)
                .build();
    }

    private ScriptStats analyzeScripts(Document doc) {
        if (doc == null) return new ScriptStats(0, 0, 0);

        Elements scripts = doc.select("script");
        int scriptCount = scripts.size();
        int renderBlocking = 0;
        int asyncOrDefer = 0;

        Elements headScripts = doc.select("head script[src]");
        for (Element s : headScripts) {
            boolean hasAsync = s.hasAttr("async");
            boolean hasDefer = s.hasAttr("defer");
            boolean isModule = "module".equalsIgnoreCase(s.attr("type"));

            if (!hasAsync && !hasDefer && !isModule) {
                renderBlocking++;
            } else {
                asyncOrDefer++;
            }
        }
        return new ScriptStats(scriptCount, renderBlocking, asyncOrDefer);
    }

    private ImageStats analyzeImages(Document doc) {
        if (doc == null) return new ImageStats(0, 0, 0, 100.0);

        Elements images = doc.select("img[src], source[srcset]");
        int total = images.size();
        int modern = 0;
        int legacy = 0;

        for (Element img : images) {
            String src = (img.hasAttr("srcset") ? img.attr("srcset") : img.attr("src")).toLowerCase();
            if (src.contains(".webp") || src.contains(".avif") || src.contains(".svg")) {
                modern++;
            } else if (src.contains(".png") || src.contains(".jpg") || src.contains(".jpeg") || src.contains(".gif") || src.contains(".bmp")) {
                legacy++;
            }
        }

        double ratio = (modern + legacy) > 0 ? ((double) modern / (modern + legacy)) * 100.0 : 100.0;
        return new ImageStats(total, modern, legacy, ratio);
    }

    private boolean checkCompression(String contentEncoding) {
        if (contentEncoding == null || contentEncoding.equalsIgnoreCase("none")) return false;
        return contentEncoding.contains("gzip") || contentEncoding.contains("br") ||
                contentEncoding.contains("deflate") || contentEncoding.contains("zstd");
    }

    private boolean checkCaching(String cacheControl) {
        if (cacheControl == null) return false;
        return cacheControl.contains("max-age") || cacheControl.contains("public") || cacheControl.contains("immutable");
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

    private PerformanceMetrics buildDefaultMetrics() {
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

    private record ScriptStats(int scriptCount, int renderBlocking, int asyncOrDefer) {}
    private record ImageStats(int totalImages, int modernImages, int legacyImages, double modernRatio) {}
}

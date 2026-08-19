package com.pulse.page.web.engine;

import com.pulse.page.web.model.LinkInspectionMetrics;
import com.pulse.page.web.model.LinkInspectionMetrics.BrokenLinkInfo;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class LinkInspectionEngine {

    private static final int MAX_LINKS_TO_CHECK = 20;
    private static final Duration LINK_CHECK_TIMEOUT = Duration.ofMillis(2500);
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PagePulseAuditor/2.0 Enterprise";

    private static final Set<String> GENERIC_ANCHOR_TEXTS = Set.of(
            "click here", "here", "read more", "learn more", "more", "link", "this", "website",
            "details", "view more", "continue reading", "see more", "go"
    );

    private final HttpClient httpClient;

    public LinkInspectionEngine() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(LINK_CHECK_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    @NonNull
    public LinkInspectionMetrics inspectLinks(@NonNull String baseUrl, @NonNull Document document) {
        if (document == null || baseUrl == null) {
            return LinkInspectionMetrics.builder()
                    .totalLinksFound(0)
                    .workingLinksCount(0)
                    .brokenLinksCount(0)
                    .redirectLinksCount(0)
                    .internalLinksCount(0)
                    .externalLinksCount(0)
                    .inPageAnchorLinksCount(0)
                    .protocolLinksCount(0)
                    .targetBlankWithoutNoopenerCount(0)
                    .insecureHttpLinksCount(0)
                    .nofollowLinksCount(0)
                    .genericAnchorLinksCount(0)
                    .emptyAnchorLinksCount(0)
                    .securityWarnings(Collections.emptyList())
                    .brokenLinks(Collections.emptyList())
                    .build();
        }

        List<Element> anchorElements = document.select("a[href]");
        int totalLinksFound = anchorElements.size();

        String baseHost = extractHost(baseUrl);
        boolean isBaseHttps = baseUrl.toLowerCase().startsWith("https://");

        int internalLinks = 0;
        int externalLinks = 0;
        int inPageAnchors = 0;
        int protocolLinks = 0;
        int targetBlankWithoutNoopener = 0;
        int insecureHttpLinks = 0;
        int nofollowLinks = 0;
        int genericAnchorCount = 0;
        int emptyAnchorCount = 0;

        List<String> securityWarnings = new ArrayList<>();
        Set<String> uniqueUrlsToCheck = new LinkedHashSet<>();
        Map<String, String> anchorTextMap = new HashMap<>();

        for (Element a : anchorElements) {
            String href = a.attr("href").trim();
            String absHref = a.attr("abs:href").trim();
            String rel = a.attr("rel").toLowerCase();
            String target = a.attr("target").toLowerCase();
            String anchorText = a.text().trim();

            if (anchorText.isBlank()) {
                if (a.select("img, svg").isEmpty()) {
                    emptyAnchorCount++;
                }
            } else if (GENERIC_ANCHOR_TEXTS.contains(anchorText.toLowerCase())) {
                genericAnchorCount++;
            }

            if (rel.contains("nofollow") || rel.contains("sponsored") || rel.contains("ugc")) {
                nofollowLinks++;
            }

            if (href.startsWith("#")) {
                inPageAnchors++;
                continue;
            }

            if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
                protocolLinks++;
                continue;
            }

            String urlToEvaluate = !absHref.isBlank() ? absHref : href;
            String linkHost = extractHost(urlToEvaluate);

            boolean isExternal = !linkHost.isBlank() && !linkHost.equalsIgnoreCase(baseHost);

            if (isExternal) {
                externalLinks++;
                if ("_blank".equals(target) && !rel.contains("noopener") && !rel.contains("noreferrer")) {
                    targetBlankWithoutNoopener++;
                }
            } else {
                internalLinks++;
            }

            if (isBaseHttps && urlToEvaluate.toLowerCase().startsWith("http://")) {
                insecureHttpLinks++;
            }

            if (urlToEvaluate.startsWith("http://") || urlToEvaluate.startsWith("https://")) {
                if (uniqueUrlsToCheck.size() < MAX_LINKS_TO_CHECK) {
                    if (uniqueUrlsToCheck.add(urlToEvaluate)) {
                        anchorTextMap.put(urlToEvaluate, anchorText.isBlank() ? a.attr("title") : anchorText);
                    }
                }
            }
        }

        if (targetBlankWithoutNoopener > 0) {
            securityWarnings.add("SECURITY WARNING: " + targetBlankWithoutNoopener + " external link(s) use target=\"_blank\" without rel=\"noopener\" (vulnerable to Reverse Tabnabbing attacks).");
        }
        if (insecureHttpLinks > 0) {
            securityWarnings.add("MIXED CONTENT: " + insecureHttpLinks + " insecure http:// link(s) found on this HTTPS page.");
        }
        if (genericAnchorCount > 0) {
            securityWarnings.add("SEO WARNING: " + genericAnchorCount + " link(s) use generic non-descriptive anchor text (e.g., 'click here', 'read more').");
        }

        // Parallel HTTP status checks
        List<BrokenLinkInfo> brokenLinks = new CopyOnWriteArrayList<>();
        int workingCount = 0;
        int redirectCount = 0;

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<LinkCheckResult>> futures = new ArrayList<>();

            for (String linkUrl : uniqueUrlsToCheck) {
                futures.add(executor.submit(() -> checkLink(linkUrl, anchorTextMap.get(linkUrl), baseHost)));
            }

            for (Future<LinkCheckResult> future : futures) {
                try {
                    LinkCheckResult res = future.get(LINK_CHECK_TIMEOUT.toMillis() + 500, TimeUnit.MILLISECONDS);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        workingCount++;
                    } else if (res.statusCode >= 300 && res.statusCode < 400) {
                        redirectCount++;
                    } else {
                        brokenLinks.add(res.toBrokenLinkInfo());
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.debug("Link inspection thread interrupted: {}", e.getMessage());
                } catch (Exception e) {
                    log.debug("Link inspection future failed: {}", e.getMessage());
                }
            }
        }

        int brokenCount = brokenLinks.size();

        return LinkInspectionMetrics.builder()
                .totalLinksFound(totalLinksFound)
                .workingLinksCount(workingCount)
                .brokenLinksCount(brokenCount)
                .redirectLinksCount(redirectCount)
                .internalLinksCount(internalLinks)
                .externalLinksCount(externalLinks)
                .inPageAnchorLinksCount(inPageAnchors)
                .protocolLinksCount(protocolLinks)
                .targetBlankWithoutNoopenerCount(targetBlankWithoutNoopener)
                .insecureHttpLinksCount(insecureHttpLinks)
                .nofollowLinksCount(nofollowLinks)
                .genericAnchorLinksCount(genericAnchorCount)
                .emptyAnchorLinksCount(emptyAnchorCount)
                .securityWarnings(securityWarnings)
                .brokenLinks(brokenLinks)
                .build();
    }

    private LinkCheckResult checkLink(String urlStr, String anchorText, String baseHost) {
        boolean external = !extractHost(urlStr).equalsIgnoreCase(baseHost);
        try {
            URI uri = URI.create(urlStr);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(LINK_CHECK_TIMEOUT)
                    .header("User-Agent", USER_AGENT)
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            int code = response.statusCode();

            if (code == 405 || code == 403) {
                HttpRequest getRequest = HttpRequest.newBuilder()
                        .uri(uri)
                        .timeout(LINK_CHECK_TIMEOUT)
                        .header("User-Agent", USER_AGENT)
                        .GET()
                        .build();
                response = httpClient.send(getRequest, HttpResponse.BodyHandlers.discarding());
                code = response.statusCode();
            }

            return new LinkCheckResult(urlStr, anchorText, code, "HTTP " + code, external);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new LinkCheckResult(urlStr, anchorText, 404, "Link check thread interrupted", external);
        } catch (Exception e) {
            return new LinkCheckResult(urlStr, anchorText, 404, "Connection refused or unreachable", external);
        }
    }

    private String extractHost(String urlStr) {
        if (urlStr == null || urlStr.isBlank()) return "";
        try {
            String host = URI.create(urlStr).getHost();
            return host != null ? host : "";
        } catch (IllegalArgumentException e) {
            return "";
        }
    }

    private record LinkCheckResult(String url, String anchorText, int statusCode, String statusMessage, boolean external) {
        BrokenLinkInfo toBrokenLinkInfo() {
            return BrokenLinkInfo.builder()
                    .url(url)
                    .anchorText(anchorText != null && !anchorText.isBlank() ? anchorText : "Anchor Link")
                    .statusCode(statusCode)
                    .statusMessage(statusMessage)
                    .external(external)
                    .build();
        }
    }
}

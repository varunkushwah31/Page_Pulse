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
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SiteLookAuditor/2.0 Enterprise";

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
        List<Element> anchorElements = document.select("a[href]");
        int totalLinksFound = anchorElements.size();
        String baseHost = extractHost(baseUrl);
        boolean isBaseHttps = baseUrl.toLowerCase().startsWith("https://");

        LinkAccumulator acc = new LinkAccumulator();
        Set<String> uniqueUrlsToCheck = new LinkedHashSet<>();
        Map<String, String> anchorTextMap = new HashMap<>();

        for (Element a : anchorElements) {
            processAnchorElement(a, baseHost, isBaseHttps, acc, uniqueUrlsToCheck, anchorTextMap);
        }

        List<String> securityWarnings = buildSecurityWarnings(acc);
        ParallelCheckResult checkResult = executeParallelLinkChecks(uniqueUrlsToCheck, anchorTextMap, baseHost);

        return LinkInspectionMetrics.builder()
                .totalLinksFound(totalLinksFound)
                .workingLinksCount(checkResult.workingCount)
                .brokenLinksCount(checkResult.brokenLinks.size())
                .redirectLinksCount(checkResult.redirectCount)
                .internalLinksCount(acc.internalLinks)
                .externalLinksCount(acc.externalLinks)
                .inPageAnchorLinksCount(acc.inPageAnchors)
                .protocolLinksCount(acc.protocolLinks)
                .targetBlankWithoutNoopenerCount(acc.targetBlankWithoutNoopener)
                .insecureHttpLinksCount(acc.insecureHttpLinks)
                .nofollowLinksCount(acc.nofollowLinks)
                .genericAnchorLinksCount(acc.genericAnchorCount)
                .emptyAnchorLinksCount(acc.emptyAnchorCount)
                .securityWarnings(securityWarnings)
                .brokenLinks(checkResult.brokenLinks)
                .build();
    }

    private void processAnchorElement(
            Element a, String baseHost, boolean isBaseHttps,
            LinkAccumulator acc, Set<String> uniqueUrlsToCheck, Map<String, String> anchorTextMap) {

        String href = a.attr("href").trim();
        String absHref = a.attr("abs:href").trim();
        String rel = a.attr("rel").toLowerCase();
        String target = a.attr("target").toLowerCase();
        String anchorText = a.text().trim();

        classifyAnchorText(a, anchorText, acc);

        if (rel.contains("nofollow") || rel.contains("sponsored") || rel.contains("ugc")) {
            acc.nofollowLinks++;
        }

        if (handleSpecialLink(href, acc)) {
            return;
        }

        String urlToEvaluate = !absHref.isBlank() ? absHref : href;
        trackLinkType(urlToEvaluate, baseHost, target, rel, acc);
        trackInsecureHttp(urlToEvaluate, isBaseHttps, acc);
        queueForValidation(urlToEvaluate, anchorText, a.attr("title"), uniqueUrlsToCheck, anchorTextMap);
    }

    private boolean handleSpecialLink(String href, LinkAccumulator acc) {
        if (href.startsWith("#")) {
            acc.inPageAnchors++;
            return true;
        }
        if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
            acc.protocolLinks++;
            return true;
        }
        return false;
    }

    private void trackLinkType(String urlToEvaluate, String baseHost, String target, String rel, LinkAccumulator acc) {
        String linkHost = extractHost(urlToEvaluate);
        boolean isExternal = !linkHost.isBlank() && !linkHost.equalsIgnoreCase(baseHost);
        if (isExternal) {
            acc.externalLinks++;
            if ("_blank".equals(target) && !rel.contains("noopener") && !rel.contains("noreferrer")) {
                acc.targetBlankWithoutNoopener++;
            }
        } else {
            acc.internalLinks++;
        }
    }

    private void trackInsecureHttp(String urlToEvaluate, boolean isBaseHttps, LinkAccumulator acc) {
        if (isBaseHttps && urlToEvaluate.toLowerCase().startsWith("http://")) {
            acc.insecureHttpLinks++;
        }
    }

    private void queueForValidation(
            String urlToEvaluate, String anchorText, String titleAttr,
            Set<String> uniqueUrlsToCheck, Map<String, String> anchorTextMap) {
        if ((urlToEvaluate.startsWith("http://") || urlToEvaluate.startsWith("https://"))
                && uniqueUrlsToCheck.size() < MAX_LINKS_TO_CHECK
                && uniqueUrlsToCheck.add(urlToEvaluate)) {
            anchorTextMap.put(urlToEvaluate, anchorText.isBlank() ? titleAttr : anchorText);
        }
    }

    private void classifyAnchorText(Element a, String anchorText, LinkAccumulator acc) {
        if (anchorText.isBlank()) {
            if (a.select("img, svg").isEmpty()) {
                acc.emptyAnchorCount++;
            }
        } else if (GENERIC_ANCHOR_TEXTS.contains(anchorText.toLowerCase())) {
            acc.genericAnchorCount++;
        }
    }

    private List<String> buildSecurityWarnings(LinkAccumulator acc) {
        List<String> warnings = new ArrayList<>();
        if (acc.targetBlankWithoutNoopener > 0) {
            warnings.add("SECURITY WARNING: " + acc.targetBlankWithoutNoopener + " external link(s) use target=\"_blank\" without rel=\"noopener\" (vulnerable to Reverse Tabnabbing attacks).");
        }
        if (acc.insecureHttpLinks > 0) {
            warnings.add("MIXED CONTENT: " + acc.insecureHttpLinks + " insecure http:// link(s) found on this HTTPS page.");
        }
        if (acc.genericAnchorCount > 0) {
            warnings.add("SEO WARNING: " + acc.genericAnchorCount + " link(s) use generic non-descriptive anchor text (e.g., 'click here', 'read more').");
        }
        return warnings;
    }

    private ParallelCheckResult executeParallelLinkChecks(
            Set<String> uniqueUrlsToCheck, Map<String, String> anchorTextMap, String baseHost) {

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
        return new ParallelCheckResult(workingCount, redirectCount, brokenLinks);
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
        } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
            return new LinkCheckResult(urlStr, anchorText, 404, "Link check thread interrupted", external);
        } catch (Exception e) {
            log.debug("Link inspection failed for URL: {}", urlStr, e);
            return new LinkCheckResult(urlStr, anchorText, 404, "Connection refused or unreachable", external);
        }
    }

    private String extractHost(String urlStr) {
        if (urlStr == null || urlStr.isBlank()) return "";
        try {
            String host = URI.create(urlStr).getHost();
            return host != null ? host : "";
        } catch (IllegalArgumentException e) {
            log.debug("Invalid URL string during host extraction: {}", urlStr, e);
            return "";
        }
    }


    private static class LinkAccumulator {
        int internalLinks = 0;
        int externalLinks = 0;
        int inPageAnchors = 0;
        int protocolLinks = 0;
        int targetBlankWithoutNoopener = 0;
        int insecureHttpLinks = 0;
        int nofollowLinks = 0;
        int genericAnchorCount = 0;
        int emptyAnchorCount = 0;
    }

    private record ParallelCheckResult(int workingCount, int redirectCount, List<BrokenLinkInfo> brokenLinks) {}

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

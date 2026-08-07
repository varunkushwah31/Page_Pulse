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
import java.util.concurrent.*;

@Slf4j
@Component
public class LinkInspectionEngine {

    private static final int MAX_LINKS_TO_CHECK = 15;
    private static final Duration LINK_CHECK_TIMEOUT = Duration.ofMillis(2500);
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PagePulseAuditor/1.0";

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
                .brokenLinks(Collections.emptyList())
                .build();
        }

        List<Element> anchorElements = document.select("a[href]");
        int totalLinksFound = anchorElements.size();

        Set<String> uniqueUrls = new LinkedHashSet<>();
        Map<String, String> anchorTextMap = new HashMap<>();

        String baseHost = extractHost(baseUrl);

        for (Element a : anchorElements) {
            String href = a.attr("abs:href").trim();
            if (href.startsWith("http://") || href.startsWith("https://")) {
                if (uniqueUrls.add(href)) {
                    String text = a.text().trim();
                    anchorTextMap.put(href, text.isBlank() ? a.attr("title") : text);
                }
            }
            if (uniqueUrls.size() >= MAX_LINKS_TO_CHECK) {
                break;
            }
        }

        List<BrokenLinkInfo> brokenLinks = new CopyOnWriteArrayList<>();
        int workingCount = 0;
        int redirectCount = 0;

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<LinkCheckResult>> futures = new ArrayList<>();

            for (String linkUrl : uniqueUrls) {
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

        log.info("Inspected {} links for baseUrl {}: {} working, {} redirects, {} broken",
            uniqueUrls.size(), baseUrl, workingCount, redirectCount, brokenCount);

        return LinkInspectionMetrics.builder()
            .totalLinksFound(totalLinksFound)
            .workingLinksCount(workingCount)
            .brokenLinksCount(brokenCount)
            .redirectLinksCount(redirectCount)
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
                // Retry with GET method if HEAD is disallowed by target server
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
            return new LinkCheckResult(urlStr, anchorText, 404, "Connection refused or URL unreachable", external);
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

package com.pulse.page.web.service;

import com.pulse.page.web.document.SitemapSnapshot;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.SitemapAuditResponse;
import com.pulse.page.web.dto.SitemapDeltaResponse;
import com.pulse.page.web.engine.UrlValidationEngine;
import com.pulse.page.web.exception.TargetHostUnreachableException;
import com.pulse.page.web.repository.mongo.SitemapSnapshotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.jsoup.select.Elements;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.GZIPInputStream;

@Slf4j
@Service
@RequiredArgsConstructor
public class SitemapCrawlerService {

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
    private static final int HTTP_TIMEOUT_MS = 8000;
    private static final Pattern LOC_TAG_REGEX = Pattern.compile("<loc>\\s*(https?://[^<\\s]+)\\s*</loc>", Pattern.CASE_INSENSITIVE);

    private final UrlValidationEngine urlValidationEngine;
    private final AuditReportProcessorService processorService;
    private final SitemapSnapshotRepository sitemapSnapshotRepository;

    public SitemapAuditResponse auditSitemap(String rawSitemapUrl, int maxUrls) throws IOException {
        String sitemapUrl = urlValidationEngine.validateAndNormalize(rawSitemapUrl);
        log.info("Starting sitemap audit for: {}", sitemapUrl);

        List<String> candidateUrls = buildCandidateSitemapUrls(sitemapUrl);
        ResolvedSitemapTarget resolvedTarget = resolveTargetUrls(sitemapUrl, candidateUrls, maxUrls);
        List<String> targetUrls = resolvedTarget.targetUrls();
        String resolvedSitemapUrl = resolvedTarget.resolvedUrl();

        log.info("Auditing {} URLs concurrently using Java Virtual Threads", targetUrls.size());
        List<AuditResponse> childAudits = executeConcurrentAudits(targetUrls);

        if (childAudits.isEmpty()) {
            throw new TargetHostUnreachableException("Failed to audit any URLs from sitemap " + resolvedSitemapUrl + ". Target servers were unreachable or blocked the scraper.");
        }

        double avgScore = childAudits.stream()
            .mapToInt(a -> a.getScores() != null ? a.getScores().getOverallScore() : 0)
            .average()
            .orElse(0.0);

        double roundedAvgScore = Math.round(avgScore * 100.0) / 100.0;
        saveSnapshotQuietly(resolvedSitemapUrl, childAudits, roundedAvgScore);

        return SitemapAuditResponse.builder()
            .sitemapUrl(resolvedSitemapUrl)
            .totalUrlsAudited(childAudits.size())
            .averageOverallScore(roundedAvgScore)
            .childAudits(childAudits)
            .build();
    }

    private record ResolvedSitemapTarget(String resolvedUrl, List<String> targetUrls) {}

    private ResolvedSitemapTarget resolveTargetUrls(String sitemapUrl, List<String> candidateUrls, int maxUrls) {
        String resolvedSitemapUrl = sitemapUrl;
        List<String> targetUrls = new ArrayList<>();
        Exception lastException = null;

        for (String candidateUrl : candidateUrls) {
            try {
                Document xmlDoc = fetchSitemapXmlDocument(candidateUrl);
                targetUrls = extractTargetUrls(xmlDoc, candidateUrl, maxUrls);
                if (!targetUrls.isEmpty()) {
                    resolvedSitemapUrl = candidateUrl;
                    log.info("Successfully extracted {} URLs from candidate: {}", targetUrls.size(), candidateUrl);
                    break;
                }
            } catch (Exception ex) {
                log.debug("Candidate sitemap URL {} failed: {}", candidateUrl, ex.getMessage());
                lastException = ex;
            }
        }

        if (targetUrls.isEmpty()) {
            if (lastException instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new IllegalArgumentException("No valid web page URLs found in sitemap or index at: " + sitemapUrl + (lastException != null ? " (" + lastException.getMessage() + ")" : ""));
        }

        return new ResolvedSitemapTarget(resolvedSitemapUrl, targetUrls);
    }

    private void saveSnapshotQuietly(String resolvedSitemapUrl, List<AuditResponse> childAudits, double roundedAvgScore) {
        try {
            Map<String, Integer> urlScores = new HashMap<>();
            for (AuditResponse child : childAudits) {
                if (child.getUrl() != null && child.getScores() != null) {
                    urlScores.put(child.getUrl(), child.getScores().getOverallScore());
                }
            }
            String domain = urlValidationEngine.extractDomain(resolvedSitemapUrl);
            SitemapSnapshot snapshot = SitemapSnapshot.builder()
                .sitemapUrl(resolvedSitemapUrl)
                .domain(domain)
                .totalUrls(childAudits.size())
                .averageScore(roundedAvgScore)
                .urlScores(urlScores)
                .build();

            sitemapSnapshotRepository.save(snapshot);
            log.info("Saved sitemap crawl snapshot to MongoDB for {}", resolvedSitemapUrl);
        } catch (Exception e) {
            log.warn("Failed to save sitemap snapshot to MongoDB: {}", e.getMessage());
        }
    }

    public SitemapDeltaResponse computeDelta(String rawSitemapUrl) {
        String sitemapUrl = urlValidationEngine.validateAndNormalize(rawSitemapUrl);
        List<SitemapSnapshot> snapshots = sitemapSnapshotRepository.findBySitemapUrlOrderByCrawlTimestampDesc(sitemapUrl, PageRequest.of(0, 2));

        if (snapshots.isEmpty()) {
            throw new IllegalArgumentException("No previous crawl snapshots found for sitemap URL: " + sitemapUrl);
        }

        SitemapSnapshot current = snapshots.get(0);
        SitemapSnapshot previous = snapshots.size() > 1 ? snapshots.get(1) : null;

        if (previous == null) {
            return buildInitialDeltaResponse(sitemapUrl, current);
        }

        return buildComparisonDeltaResponse(sitemapUrl, current, previous);
    }

    private SitemapDeltaResponse buildInitialDeltaResponse(String sitemapUrl, SitemapSnapshot current) {
        return SitemapDeltaResponse.builder()
            .sitemapUrl(sitemapUrl)
            .currentCrawlTimestamp(current.getCrawlTimestamp())
            .previousCrawlTimestamp(null)
            .newPages(new ArrayList<>(current.getUrlScores() != null ? current.getUrlScores().keySet() : List.of()))
            .removedPages(List.of())
            .scoreRegressions(List.of())
            .scoreImprovements(List.of())
            .unchangedCount(0)
            .build();
    }

    private SitemapDeltaResponse buildComparisonDeltaResponse(String sitemapUrl, SitemapSnapshot current, SitemapSnapshot previous) {
        Map<String, Integer> currScores = current.getUrlScores() != null ? current.getUrlScores() : Map.of();
        Map<String, Integer> prevScores = previous.getUrlScores() != null ? previous.getUrlScores() : Map.of();

        List<String> newPages = new ArrayList<>();
        List<String> removedPages = new ArrayList<>();
        List<SitemapDeltaResponse.ScoreRegressionItem> regressions = new ArrayList<>();
        List<SitemapDeltaResponse.ScoreImprovementItem> improvements = new ArrayList<>();
        int unchangedCount = 0;

        for (Map.Entry<String, Integer> entry : currScores.entrySet()) {
            String url = entry.getKey();
            int currScore = entry.getValue();

            if (!prevScores.containsKey(url)) {
                newPages.add(url);
            } else {
                int prevScore = prevScores.get(url);
                if (currScore < prevScore) {
                    regressions.add(SitemapDeltaResponse.ScoreRegressionItem.builder()
                        .url(url)
                        .previousScore(prevScore)
                        .currentScore(currScore)
                        .scoreDrop(prevScore - currScore)
                        .build());
                } else if (currScore > prevScore) {
                    improvements.add(SitemapDeltaResponse.ScoreImprovementItem.builder()
                        .url(url)
                        .previousScore(prevScore)
                        .currentScore(currScore)
                        .scoreGain(currScore - prevScore)
                        .build());
                } else {
                    unchangedCount++;
                }
            }
        }

        for (String url : prevScores.keySet()) {
            if (!currScores.containsKey(url)) {
                removedPages.add(url);
            }
        }

        return SitemapDeltaResponse.builder()
            .sitemapUrl(sitemapUrl)
            .currentCrawlTimestamp(current.getCrawlTimestamp())
            .previousCrawlTimestamp(previous.getCrawlTimestamp())
            .newPages(newPages)
            .removedPages(removedPages)
            .scoreRegressions(regressions)
            .scoreImprovements(improvements)
            .unchangedCount(unchangedCount)
            .build();
    }

    private List<String> buildCandidateSitemapUrls(String originalUrl) {
        LinkedHashSet<String> candidates = new LinkedHashSet<>();
        candidates.add(originalUrl);

        try {
            URI uri = URI.create(originalUrl);
            String scheme = uri.getScheme() != null ? uri.getScheme() : "https";
            String host = uri.getHost();

            if (host != null) {
                String domainRoot = scheme + "://" + host;

                // 1. Try discovering sitemaps declared in robots.txt
                List<String> robotsSitemaps = fetchRobotsTxtSitemaps(domainRoot);
                candidates.addAll(robotsSitemaps);

                // 2. Standard common sitemap locations
                candidates.add(domainRoot + "/sitemap.xml");
                candidates.add(domainRoot + "/sitemap_index.xml");
                candidates.add(domainRoot + "/sitemap-index.xml");
                candidates.add(domainRoot + "/sitemaps_list.xml");
                candidates.add(domainRoot + "/sitemaps/sitemap.xml");
                candidates.add(domainRoot + "/sitemap/sitemap.xml");
                candidates.add(domainRoot + "/sitemap.xml.gz");
                candidates.add(domainRoot + "/sitemap_index.xml.gz");
            }
        } catch (Exception e) {
            log.debug("Error building candidate URLs for {}: {}", originalUrl, e.getMessage());
        }

        return new ArrayList<>(candidates);
    }

    private List<String> fetchRobotsTxtSitemaps(String domainRoot) {
        List<String> sitemaps = new ArrayList<>();
        String robotsUrl = domainRoot + "/robots.txt";
        try {
            Connection.Response response = Jsoup.connect(robotsUrl)
                .timeout(3000)
                .userAgent(USER_AGENT)
                .header("Accept", "text/plain,*/*")
                .followRedirects(true)
                .ignoreHttpErrors(true)
                .ignoreContentType(true)
                .execute();

            if (response.statusCode() == 200 && response.body() != null) {
                for (String line : response.body().split("\n")) {
                    String trimmed = line.trim();
                    if (trimmed.toLowerCase().startsWith("sitemap:")) {
                        String sitemapLoc = trimmed.substring(8).trim();
                        if (sitemapLoc.startsWith("http://") || sitemapLoc.startsWith("https://")) {
                            sitemaps.add(sitemapLoc);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.trace("Could not read robots.txt from {}: {}", robotsUrl, e.getMessage());
        }
        return sitemaps;
    }

    private Document fetchSitemapXmlDocument(String targetUrl) throws IOException {
        Connection connection = Jsoup.connect(targetUrl)
            .timeout(HTTP_TIMEOUT_MS)
            .userAgent(USER_AGENT)
            .header("Accept", "application/xml, text/xml, application/xhtml+xml, text/html;q=0.9, */*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.9")
            .header("Accept-Encoding", "gzip, deflate")
            .header("Sec-Ch-Ua", "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"")
            .header("Sec-Ch-Ua-Mobile", "?0")
            .header("Sec-Ch-Ua-Platform", "\"Windows\"")
            .header("Sec-Fetch-Dest", "document")
            .header("Sec-Fetch-Mode", "navigate")
            .header("Sec-Fetch-Site", "none")
            .header("Sec-Fetch-User", "?1")
            .followRedirects(true)
            .ignoreHttpErrors(true)
            .ignoreContentType(true);

        Connection.Response response = connection.execute();
        int statusCode = response.statusCode();

        if (statusCode == 403) {
            throw new TargetHostUnreachableException("Access to sitemap at '" + targetUrl + "' was blocked by the target host (HTTP 403 Forbidden). Anti-bot firewall rules may be active.");
        }
        if (statusCode == 404) {
            throw new IllegalArgumentException("Sitemap XML document not found at '" + targetUrl + "' (HTTP 404 Not Found).");
        }
        if (statusCode == 406) {
            throw new TargetHostUnreachableException("Target host rejected XML request at '" + targetUrl + "' (HTTP 406 Not Acceptable).");
        }
        if (statusCode >= 400) {
            throw new TargetHostUnreachableException("Target host returned HTTP " + statusCode + " error for sitemap URL: " + targetUrl);
        }

        byte[] rawBytes = response.bodyAsBytes();
        if (rawBytes.length == 0) {
            throw new IllegalArgumentException("Target sitemap URL returned an empty response body: " + targetUrl);
        }

        String xmlContent = decodeResponseBody(rawBytes, targetUrl, response.header("Content-Encoding"));
        return Parser.xmlParser().parseInput(xmlContent, targetUrl);
    }

    private String decodeResponseBody(byte[] bytes, String url, String contentEncoding) {
        boolean isGzip = (contentEncoding != null && contentEncoding.toLowerCase().contains("gzip"))
                || url.toLowerCase().endsWith(".gz")
                || (bytes.length >= 2 && (bytes[0] == (byte) 0x1f) && (bytes[1] == (byte) 0x8b));

        if (isGzip) {
            try (GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(bytes))) {
                return new String(gis.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                log.debug("GZIP decompression fallback for {}: {}", url, e.getMessage());
            }
        }

        return new String(bytes, StandardCharsets.UTF_8);
    }

    private List<String> extractTargetUrls(Document xmlDoc, String sitemapUrl, int maxUrls) {
        LinkedHashSet<String> pageUrls = new LinkedHashSet<>();
        int effectiveLimit = maxUrls > 0 ? maxUrls : 10;

        // 1. Check if this is a <sitemapindex> containing child <sitemap> entries
        extractFromSitemapIndex(xmlDoc, sitemapUrl, effectiveLimit, pageUrls);

        // 2. Direct <loc> elements in standard <urlset>
        if (pageUrls.isEmpty()) {
            extractFromDirectLocTags(xmlDoc, effectiveLimit, pageUrls);
        }

        // 3. Regex fallback to extract <loc> tags directly from raw XML string
        if (pageUrls.isEmpty()) {
            extractFromRegexFallback(xmlDoc, effectiveLimit, pageUrls);
        }

        return new ArrayList<>(pageUrls);
    }

    private void extractFromSitemapIndex(Document xmlDoc, String sitemapUrl, int effectiveLimit, Set<String> pageUrls) {
        Elements sitemapElements = xmlDoc.getElementsByTag("sitemap");
        if (sitemapElements.isEmpty()) return;

        log.info("Detected sitemap index with {} <sitemap> entries in {}", sitemapElements.size(), sitemapUrl);
        int childCount = 0;

        for (Element sitemapElem : sitemapElements) {
            if (pageUrls.size() >= effectiveLimit || childCount >= 5) {
                break;
            }
            Element locNode = sitemapElem.getElementsByTag("loc").first();
            if (locNode == null) continue;

            String childSitemapUrl = locNode.text().trim();
            if (childSitemapUrl.isBlank()) continue;

            childCount++;
            expandChildSitemap(childSitemapUrl, childCount, sitemapElements.size(), effectiveLimit, pageUrls);
        }
    }

    private void expandChildSitemap(String childSitemapUrl, int childIndex, int totalChildren, int effectiveLimit, Set<String> pageUrls) {
        try {
            log.info("Expanding child sitemap [#{}/{}]: {}", childIndex, totalChildren, childSitemapUrl);
            Document childDoc = fetchSitemapXmlDocument(childSitemapUrl);

            for (Element childLoc : childDoc.getElementsByTag("loc")) {
                if (pageUrls.size() >= effectiveLimit) break;
                String pageUrl = childLoc.text().trim();
                if (isValidWebPageUrl(pageUrl)) {
                    pageUrls.add(pageUrl);
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse child sitemap {}: {}", childSitemapUrl, e.getMessage());
        }
    }

    private void extractFromDirectLocTags(Document xmlDoc, int effectiveLimit, Set<String> pageUrls) {
        for (Element locElem : xmlDoc.getElementsByTag("loc")) {
            if (pageUrls.size() >= effectiveLimit) break;
            String pageUrl = locElem.text().trim();
            if (isValidWebPageUrl(pageUrl)) {
                pageUrls.add(pageUrl);
            }
        }
    }

    private void extractFromRegexFallback(Document xmlDoc, int effectiveLimit, Set<String> pageUrls) {
        Matcher matcher = LOC_TAG_REGEX.matcher(xmlDoc.html());
        while (matcher.find() && pageUrls.size() < effectiveLimit) {
            String candidate = matcher.group(1).trim();
            if (isValidWebPageUrl(candidate)) {
                pageUrls.add(candidate);
            }
        }
    }

    private boolean isValidWebPageUrl(String url) {
        if (url == null || url.isBlank()) return false;
        String trimmed = url.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return false;

        String lower = trimmed.toLowerCase();
        return !isDisallowedMediaOrArchiveExtension(lower);
    }

    private boolean isDisallowedMediaOrArchiveExtension(String lower) {
        return lower.endsWith(".xml") || lower.endsWith(".xml.gz") || lower.endsWith(".gz")
                || lower.endsWith(".pdf") || lower.endsWith(".zip") || lower.endsWith(".tar")
                || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")
                || lower.endsWith(".gif") || lower.endsWith(".svg") || lower.endsWith(".mp4");
    }

    private List<AuditResponse> executeConcurrentAudits(List<String> targetUrls) {
        List<AuditResponse> childAudits = Collections.synchronizedList(new ArrayList<>());

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<AuditResponse>> futures = targetUrls.stream()
                .map(url -> executor.submit(() -> {
                    try {
                        return processorService.processAudit(url);
                    } catch (Exception e) {
                        log.warn("Child URL audit failed for {}: {}", url, e.getMessage());
                        return null;
                    }
                }))
                .toList();

            for (Future<AuditResponse> future : futures) {
                collectFutureResult(future, childAudits);
            }
        }
        return childAudits;
    }

    private void collectFutureResult(Future<AuditResponse> future, List<AuditResponse> childAudits) {
        try {
            AuditResponse res = future.get(15, TimeUnit.SECONDS);
            if (res != null) {
                childAudits.add(res);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Thread interrupted during child URL audit", e);
        } catch (ExecutionException | TimeoutException e) {
            log.warn("Child URL audit execution timed out or threw exception", e);
        }
    }
}

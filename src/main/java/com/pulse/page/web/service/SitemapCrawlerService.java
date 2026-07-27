package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.SitemapAuditResponse;
import com.pulse.page.web.engine.UrlValidationEngine;
import com.pulse.page.web.exception.TargetHostUnreachableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.parser.Parser;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class SitemapCrawlerService {

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 PagePulse/2.0 Enterprise Crawler";

    private final UrlValidationEngine urlValidationEngine;
    private final AuditReportProcessorService processorService;

    public SitemapAuditResponse auditSitemap(String rawSitemapUrl, int maxUrls) throws IOException {
        String sitemapUrl = urlValidationEngine.validateAndNormalize(rawSitemapUrl);
        log.info("Fetching sitemap XML from: {}", sitemapUrl);

        List<String> candidateUrls = buildCandidateSitemapUrls(sitemapUrl);
        Document xmlDoc = null;
        String resolvedSitemapUrl = sitemapUrl;
        Exception lastException = null;

        for (String candidateUrl : candidateUrls) {
            try {
                xmlDoc = fetchSitemapXmlDocument(candidateUrl);
                resolvedSitemapUrl = candidateUrl;
                break;
            } catch (Exception ex) {
                log.warn("Attempt to fetch sitemap from candidate {} failed: {}", candidateUrl, ex.getMessage());
                lastException = ex;
            }
        }

        if (xmlDoc == null) {
            if (lastException instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new TargetHostUnreachableException("Failed to fetch sitemap XML from " + sitemapUrl + ": " + (lastException != null ? lastException.getMessage() : "Unknown connection error"));
        }

        List<String> targetUrls = extractTargetUrls(xmlDoc, maxUrls);
        if (targetUrls.isEmpty()) {
            throw new IllegalArgumentException("No valid URL locations found in sitemap: " + resolvedSitemapUrl);
        }

        log.info("Auditing {} URLs concurrently using Java Virtual Threads", targetUrls.size());
        List<AuditResponse> childAudits = executeConcurrentAudits(targetUrls);

        double avgScore = childAudits.stream()
            .mapToInt(a -> a.getScores() != null ? a.getScores().getOverallScore() : 0)
            .average()
            .orElse(0.0);

        return SitemapAuditResponse.builder()
            .sitemapUrl(resolvedSitemapUrl)
            .totalUrlsAudited(childAudits.size())
            .averageOverallScore(Math.round(avgScore * 100.0) / 100.0)
            .childAudits(childAudits)
            .build();
    }

    private List<String> buildCandidateSitemapUrls(String originalUrl) {
        List<String> candidates = new ArrayList<>();
        candidates.add(originalUrl);

        String lower = originalUrl.toLowerCase();
        if (!lower.endsWith(".xml")) {
            String baseUrl = originalUrl.endsWith("/") ? originalUrl : originalUrl + "/";
            candidates.add(baseUrl + "sitemap.xml");
            candidates.add(baseUrl + "sitemap-index.xml");
            candidates.add(baseUrl + "sitemap_index.xml");
        }
        return candidates;
    }

    private Document fetchSitemapXmlDocument(String targetUrl) throws IOException {
        Connection connection = Jsoup.connect(targetUrl)
            .timeout(5000)
            .userAgent(USER_AGENT)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.9")
            .followRedirects(true)
            .ignoreHttpErrors(true);

        Connection.Response response = connection.execute();
        int statusCode = response.statusCode();

        if (statusCode == 403) {
            throw new TargetHostUnreachableException("Access to sitemap at '" + targetUrl + "' was blocked by the target host (HTTP 403 Forbidden). The host may be protected by anti-bot firewall rules.");
        }
        if (statusCode == 404) {
            throw new IllegalArgumentException("Sitemap XML document not found at '" + targetUrl + "' (HTTP 404 Not Found).");
        }
        if (statusCode >= 400) {
            throw new TargetHostUnreachableException("Target host returned HTTP " + statusCode + " error for sitemap URL: " + targetUrl);
        }

        String body = response.body();
        if (body == null || body.isBlank()) {
            throw new IllegalArgumentException("Target sitemap URL returned an empty response body: " + targetUrl);
        }

        return Parser.xmlParser().parseInput(body, targetUrl);
    }

    private List<String> extractTargetUrls(Document xmlDoc, int maxUrls) {
        Elements locs = xmlDoc.select("loc");
        List<String> targetUrls = new ArrayList<>();
        int limit = Math.min(maxUrls > 0 ? maxUrls : 15, locs.size());

        for (int i = 0; i < limit; i++) {
            String url = locs.get(i).text().trim();
            if (!url.isBlank()) {
                targetUrls.add(url);
            }
        }
        return targetUrls;
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
            AuditResponse res = future.get(10, TimeUnit.SECONDS);
            if (res != null) {
                childAudits.add(res);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Thread interrupted during child URL audit", e);
        } catch (ExecutionException | TimeoutException e) {
            log.warn("Child URL audit execution failed or timed out", e);
        }
    }
}

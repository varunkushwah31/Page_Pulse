package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.SitemapAuditResponse;
import com.pulse.page.web.engine.UrlValidationEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
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

    private final UrlValidationEngine urlValidationEngine;
    private final AuditReportProcessorService processorService;

    public SitemapAuditResponse auditSitemap(String rawSitemapUrl, int maxUrls) throws IOException {
        String sitemapUrl = urlValidationEngine.validateAndNormalize(rawSitemapUrl);
        log.info("Fetching sitemap XML from: {}", sitemapUrl);

        Document xmlDoc = Jsoup.connect(sitemapUrl)
            .timeout(7000)
            .userAgent("Mozilla/5.0 PagePulse/2.0 SitemapCrawler")
            .parser(Parser.xmlParser())
            .get();

        List<String> targetUrls = extractTargetUrls(xmlDoc, maxUrls);
        if (targetUrls.isEmpty()) {
            throw new IllegalArgumentException("No valid URL locations found in sitemap: " + sitemapUrl);
        }

        log.info("Auditing {} URLs concurrently using Java Virtual Threads", targetUrls.size());
        List<AuditResponse> childAudits = executeConcurrentAudits(targetUrls);

        double avgScore = childAudits.stream()
            .mapToInt(a -> a.getScores() != null ? a.getScores().getOverallScore() : 0)
            .average()
            .orElse(0.0);

        return SitemapAuditResponse.builder()
            .sitemapUrl(sitemapUrl)
            .totalUrlsAudited(childAudits.size())
            .averageOverallScore(Math.round(avgScore * 100.0) / 100.0)
            .childAudits(childAudits)
            .build();
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
            log.warn("Interrupted waiting for virtual thread audit result: {}", e.getMessage());
        } catch (Exception e) {
            log.warn("Error waiting for virtual thread audit result: {}", e.getMessage());
        }
    }
}

package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.model.PerformanceMetrics;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

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
                .build();
        }

        Document doc = scrapeResult.getDocument();
        int scriptCount = doc != null ? doc.select("script[src]").size() : 0;
        int stylesheetCount = doc != null ? doc.select("link[rel~=stylesheet i]").size() : 0;
        int imageCount = doc != null ? doc.select("img[src]").size() : 0;

        boolean isSecure = scrapeResult.getTargetUrl() != null &&
            scrapeResult.getTargetUrl().toLowerCase().startsWith("https://");

        return PerformanceMetrics.builder()
            .statusCode(scrapeResult.getStatusCode())
            .responseTimeMs(scrapeResult.getResponseTimeMs())
            .contentType(scrapeResult.getContentType() != null ? scrapeResult.getContentType() : "text/html")
            .isSecureSsl(isSecure)
            .scriptResourceCount(scriptCount)
            .stylesheetResourceCount(stylesheetCount)
            .imageResourceCount(imageCount)
            .build();
    }
}

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
        Document doc = scrapeResult.getDocument();

        int scriptCount = doc.select("script[src]").size();
        int stylesheetCount = doc.select("link[rel~=stylesheet i]").size();
        int imageCount = doc.select("img[src]").size();

        boolean isSecure = scrapeResult.getTargetUrl() != null &&
            scrapeResult.getTargetUrl().toLowerCase().startsWith("https://");

        return PerformanceMetrics.builder()
            .statusCode(scrapeResult.getStatusCode())
            .responseTimeMs(scrapeResult.getResponseTimeMs())
            .contentType(scrapeResult.getContentType())
            .isSecureSsl(isSecure)
            .scriptResourceCount(scriptCount)
            .stylesheetResourceCount(stylesheetCount)
            .imageResourceCount(imageCount)
            .build();
    }
}

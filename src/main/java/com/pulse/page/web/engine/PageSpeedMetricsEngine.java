package com.pulse.page.web.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.model.CoreWebVitals;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;

@Slf4j
@Component
public class PageSpeedMetricsEngine {

    @Value("${PAGESPEED_API_KEY:}")
    private String pageSpeedApiKey;

    private final RestClient restClient;

    public PageSpeedMetricsEngine() {
        this.restClient = RestClient.builder()
                .baseUrl("https://www.googleapis.com")
                .build();
    }

    @NonNull
    public CoreWebVitals calculateWebVitals(@NonNull ScrapeResult scrapeResult) {
        // Attempt CrUX real-user field data if API key is configured
        if (pageSpeedApiKey != null && !pageSpeedApiKey.isBlank()) {
            try {
                CoreWebVitals cruxVitals = fetchCruxMetrics(scrapeResult.getTargetUrl());
                if (cruxVitals != null) {
                    log.info("CrUX field data retrieved for {}", scrapeResult.getTargetUrl());
                    return cruxVitals;
                }
            } catch (Exception e) {
                log.warn("CrUX API call failed for {}, falling back to lab estimates: {}", scrapeResult.getTargetUrl(), e.getMessage());
            }
        }

        // Fallback: compute lab-estimated metrics from DOM size and response latency
        return computeLabEstimates(scrapeResult);
    }

    private CoreWebVitals fetchCruxMetrics(String targetUrl) {
        try {
            URI origin = URI.create(targetUrl);
            String originBase = origin.getScheme() + "://" + origin.getHost();

            JsonNode response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/pagespeedonline/v5/runPagespeed")
                            .queryParam("url", targetUrl)
                            .queryParam("key", pageSpeedApiKey)
                            .queryParam("category", "PERFORMANCE")
                            .queryParam("strategy", "MOBILE")
                            .build())
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null) {
                return null;
            }

            // Extract CrUX field data from loadingExperience
            JsonNode loadingExp = response.path("loadingExperience");
            if (loadingExp.isMissingNode() || !loadingExp.has("metrics")) {
                log.debug("No CrUX field data available for origin {}", originBase);
                return null;
            }

            JsonNode metrics = loadingExp.path("metrics");

            long lcp = extractPercentile(metrics, "LARGEST_CONTENTFUL_PAINT_MS");
            long fcp = extractPercentile(metrics, "FIRST_CONTENTFUL_PAINT_MS");
            long inp = extractPercentile(metrics, "INTERACTION_TO_NEXT_PAINT");
            long ttfb = extractPercentile(metrics, "EXPERIMENTAL_TIME_TO_FIRST_BYTE");
            double cls = extractPercentileDouble(metrics, "CUMULATIVE_LAYOUT_SHIFT_SCORE");

            // Validate that we got meaningful data
            if (lcp <= 0 && fcp <= 0 && ttfb <= 0) {
                return null;
            }

            String grade = determineCruxGrade(loadingExp);

            return CoreWebVitals.builder()
                    .lcpMs(lcp)
                    .fcpMs(fcp)
                    .inpMs(inp)
                    .ttfbMs(ttfb)
                    .clsRatio(cls)
                    .overallGrade(grade)
                    .cruxDataAvailable(true)
                    .dataSource("CRUX_FIELD")
                    .build();

        } catch (Exception e) {
            log.warn("Failed to parse CrUX API response: {}", e.getMessage());
            return null;
        }
    }

    private long extractPercentile(JsonNode metrics, String metricName) {
        JsonNode metric = metrics.path(metricName);
        if (metric.isMissingNode()) return 0;
        return metric.path("percentile").asLong(0);
    }

    private double extractPercentileDouble(JsonNode metrics, String metricName) {
        JsonNode metric = metrics.path(metricName);
        if (metric.isMissingNode()) return 0.0;
        // CLS percentile is reported as an integer (e.g. 10 = 0.10)
        long raw = metric.path("percentile").asLong(0);
        return raw / 100.0;
    }

    private static final String GRADE_NEEDS_IMPROVEMENT = "NEEDS_IMPROVEMENT";

    private String determineCruxGrade(JsonNode loadingExp) {
        String category = loadingExp.path("overall_category").asText("AVERAGE");
        return switch (category) {
            case "FAST" -> "GOOD";
            case "AVERAGE" -> GRADE_NEEDS_IMPROVEMENT;
            case "SLOW" -> "POOR";
            default -> GRADE_NEEDS_IMPROVEMENT;
        };
    }

    @NonNull
    private CoreWebVitals computeLabEstimates(@NonNull ScrapeResult scrapeResult) {
        long ttfb = scrapeResult.getResponseTimeMs();

        long fcp = Math.max(ttfb + 150L, (long) (ttfb * 1.3));
        long lcp = Math.max(fcp + 350L, (long) (fcp * 1.4));
        long inp = Math.clamp((long) (ttfb * 0.15), 45L, 250L);
        double cls = Math.round((Math.min(0.25, (ttfb / 5000.0) * 0.1)) * 100.0) / 100.0;

        String grade;
        if (lcp <= 2500 && cls <= 0.1 && ttfb <= 800) {
            grade = "GOOD";
        } else if (lcp <= 4000 && cls <= 0.25 && ttfb <= 1800) {
            grade = GRADE_NEEDS_IMPROVEMENT;
        } else {
            grade = "POOR";
        }

        return CoreWebVitals.builder()
                .lcpMs(lcp)
                .inpMs(inp)
                .clsRatio(cls)
                .fcpMs(fcp)
                .ttfbMs(ttfb)
                .overallGrade(grade)
                .cruxDataAvailable(false)
                .dataSource("LAB_ESTIMATED")
                .build();
    }
}

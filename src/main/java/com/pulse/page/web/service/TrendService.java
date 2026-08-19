package com.pulse.page.web.service;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.dto.TrendResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrendService {

    private static final String FIELD_SAVED_AT = "savedAt";

    private final MongoTemplate mongoTemplate;

    public TrendResponse getTrend(String domain, String metric, Integer days, Integer limit) {
        Instant to = Instant.now();
        Instant from = days != null ? to.minusSeconds(days * 24L * 60 * 60) : to.minusSeconds(30L * 24 * 60 * 60);
        int maxResults = limit != null ? limit : 100;

        log.info("Fetching trend for domain: {}, metric: {}, from: {}, to: {}", domain, metric, from, to);

        Query query = new Query()
                .addCriteria(Criteria.where("domain").is(domain)
                        .and(FIELD_SAVED_AT).gte(from).lte(to))
                .with(Sort.by(Sort.Direction.ASC, FIELD_SAVED_AT))
                .limit(maxResults);

        List<AuditReportDocument> reports = mongoTemplate.find(query, AuditReportDocument.class);

        if (reports.isEmpty()) {
            return TrendResponse.builder()
                    .domain(domain)
                    .metric(metric)
                    .from(from)
                    .to(to)
                    .dataPoints(0)
                    .data(List.of())
                    .build();
        }

        List<TrendResponse.DataPoint> dataPoints = reports.stream()
                .map(report -> extractMetricValue(report, metric))
                .filter(dp -> dp.getValue() != null)
                .sorted(Comparator.comparing(TrendResponse.DataPoint::getTimestamp))
                .toList();

        TrendResponse.Summary summary = computeSummary(dataPoints);

        return TrendResponse.builder()
                .domain(domain)
                .metric(metric)
                .from(from)
                .to(to)
                .dataPoints(dataPoints.size())
                .data(dataPoints)
                .summary(summary)
                .build();
    }

    public List<TrendResponse> getAllMetricsTrend(String domain, Integer days, Integer limit) {
        Instant to = Instant.now();
        Instant from = days != null ? to.minusSeconds(days * 24L * 60 * 60) : to.minusSeconds(30L * 24 * 60 * 60);
        int maxResults = limit != null ? limit : 100;

        Query query = new Query()
                .addCriteria(Criteria.where("domain").is(domain)
                        .and(FIELD_SAVED_AT).gte(from).lte(to))
                .with(Sort.by(Sort.Direction.ASC, FIELD_SAVED_AT))
                .limit(maxResults);

        List<AuditReportDocument> reports = mongoTemplate.find(query, AuditReportDocument.class);

        if (reports.isEmpty()) {
            return List.of();
        }

        String[] metrics = {"overallScore", "seoScore", "contentScore", "accessibilityScore", "performanceScore", "responseTimeMs", "wordCount"};

        return java.util.Arrays.stream(metrics)
                .map(metric -> {
                    List<TrendResponse.DataPoint> dataPoints = reports.stream()
                            .map(report -> extractMetricValue(report, metric))
                            .filter(dp -> dp.getValue() != null)
                            .sorted(Comparator.comparing(TrendResponse.DataPoint::getTimestamp))
                            .toList();

                    TrendResponse.Summary summary = computeSummary(dataPoints);

                    return TrendResponse.builder()
                            .domain(domain)
                            .metric(metric)
                            .from(from)
                            .to(to)
                            .dataPoints(dataPoints.size())
                            .data(dataPoints)
                            .summary(summary)
                            .build();
                })
                .toList();
    }

    private TrendResponse.DataPoint extractMetricValue(AuditReportDocument report, String metric) {
        Double value = switch (metric) {
            case "overallScore" -> (double) report.getOverallScore();
            case "seoScore" -> (double) report.getSeoScore();
            case "contentScore" -> (double) report.getContentScore();
            case "accessibilityScore" -> (double) report.getAccessibilityScore();
            case "performanceScore" -> (double) report.getPerformanceScore();
            case "responseTimeMs" -> (double) report.getResponseTimeMs();
            case "wordCount" -> (double) report.getWordCount();
            case "h1Count" -> (double) report.getH1Count();
            case "imagesMissingAltCount" -> (double) report.getImagesMissingAltCount();
            default -> null;
        };

        return TrendResponse.DataPoint.builder()
                .timestamp(report.getSavedAt())
                .value(value)
                .auditId(report.getOriginalTempId())
                .build();
    }

    private TrendResponse.Summary computeSummary(List<TrendResponse.DataPoint> dataPoints) {
        if (dataPoints.isEmpty()) {
            return TrendResponse.Summary.builder()
                    .trend("NONE")
                    .build();
        }

        List<Double> values = dataPoints.stream()
                .map(TrendResponse.DataPoint::getValue)
                .toList();

        Double min = values.stream().min(Double::compare).orElse(0.0);
        Double max = values.stream().max(Double::compare).orElse(0.0);
        Double average = values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        Double latest = values.get(values.size() - 1);
        Double previous = values.size() > 1 ? values.get(values.size() - 2) : null;

        Double change = previous != null ? latest - previous : 0.0;
        Double changePercent = previous != null && previous != 0 ? (change / previous) * 100.0 : 0.0;

        String trend;
        if (change > 0.5) trend = "UP";
        else if (change < -0.5) trend = "DOWN";
        else trend = "STABLE";

        return TrendResponse.Summary.builder()
                .min(min)
                .max(max)
                .average(Math.round(average * 100.0) / 100.0)
                .latest(latest)
                .previous(previous)
                .change(Math.round(change * 100.0) / 100.0)
                .changePercent(Math.round(changePercent * 100.0) / 100.0)
                .trend(trend)
                .build();
    }
}
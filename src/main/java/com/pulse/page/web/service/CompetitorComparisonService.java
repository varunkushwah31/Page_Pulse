package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.CompetitorComparisonRequest;
import com.pulse.page.web.dto.CompetitorComparisonResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompetitorComparisonService {

    private final AuditReportProcessorService processorService;
    private final CacheService cacheService;

    @Transactional
    public CompetitorComparisonResponse compareCompetitors(CompetitorComparisonRequest request) {
        String correlationId = request.getCorrelationId();
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = java.util.UUID.randomUUID().toString();
        }

        log.info("Starting competitor comparison for {} URLs (correlationId: {})",
                request.getUrls().size(), correlationId);

        List<CompetitorComparisonResponse.CompetitorResult> results = request.getUrls().stream()
                .map(url -> {
                    try {
                        Optional<AuditResponse> cached = cacheService.getCachedAudit(url);
                        AuditResponse response = cached.orElseGet(() -> {
                            try {
                                return processorService.processAudit(url);
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        });

                        CompetitorComparisonResponse.CompetitorResult result = CompetitorComparisonResponse.CompetitorResult.builder()
                                .url(url)
                                .overallScore(response.getScores() != null ? response.getScores().getOverallScore() : 0)
                                .seoScore(response.getScores() != null ? response.getScores().getSeoScore() : 0)
                                .contentScore(response.getScores() != null ? response.getScores().getContentScore() : 0)
                                .accessibilityScore(response.getScores() != null ? response.getScores().getAccessibilityScore() : 0)
                                .performanceScore(response.getScores() != null ? response.getScores().getPerformanceScore() : 0)
                                .healthGrade(response.getScores() != null ? response.getScores().getHealthGrade().name() : "UNKNOWN")
                                .responseTimeMs(response.getResponseTimeMs())
                                .wordCount(response.getContentMetrics() != null ? response.getContentMetrics().getWordCount() : 0)
                                .h1Count(response.getContentMetrics() != null ? response.getContentMetrics().getHeadingCounts() != null ? response.getContentMetrics().getHeadingCounts().getOrDefault("h1", 0) : 0 : 0)
                                .imagesMissingAlt(response.getAccessibilityMetrics() != null ? response.getAccessibilityMetrics().getImagesMissingAltCount() : 0)
                                .status("SUCCESS")
                                .cached(cached.isPresent())
                                .build();

                        return result;

                    } catch (Exception e) {
                        log.warn("Competitor audit failed for {}: {}", url, e.getMessage());
                        return CompetitorComparisonResponse.CompetitorResult.builder()
                                .url(url)
                                .status("FAILED")
                                .error(e.getMessage())
                                .build();
                    }
                })
                .collect(Collectors.toList());

        // Calculate rankings
        List<CompetitorComparisonResponse.CompetitorResult> successful = results.stream()
                .filter(r -> "SUCCESS".equals(r.getStatus()))
                .sorted(Comparator.comparingInt(CompetitorComparisonResponse.CompetitorResult::getOverallScore).reversed())
                .collect(Collectors.toList());

        // Assign ranks
        for (int i = 0; i < successful.size(); i++) {
            successful.get(i).setRank(i + 1);
        }

        // Generate summary
        CompetitorComparisonResponse.Summary summary = generateSummary(successful);

        return CompetitorComparisonResponse.builder()
                .correlationId(correlationId)
                .totalCompetitors(request.getUrls().size())
                .successfulAudits((int) results.stream().filter(r -> "SUCCESS".equals(r.getStatus())).count())
                .failedAudits((int) results.stream().filter(r -> "FAILED".equals(r.getStatus())).count())
                .results(results)
                .summary(summary)
                .generatedAt(java.time.Instant.now())
                .build();
    }

    private CompetitorComparisonResponse.Summary generateSummary(List<CompetitorComparisonResponse.CompetitorResult> successful) {
        if (successful.isEmpty()) {
            return CompetitorComparisonResponse.Summary.builder()
                    .bestOverall(null)
                    .worstOverall(null)
                    .averageOverallScore(0.0)
                    .bestSeo(null)
                    .bestContent(null)
                    .bestAccessibility(null)
                    .bestPerformance(null)
                    .build();
        }

        var bestOverall = successful.get(0);
        var worstOverall = successful.get(successful.size() - 1);

        var bestSeo = successful.stream()
                .max(Comparator.comparingInt(CompetitorComparisonResponse.CompetitorResult::getSeoScore))
                .orElse(null);

        var bestContent = successful.stream()
                .max(Comparator.comparingInt(CompetitorComparisonResponse.CompetitorResult::getContentScore))
                .orElse(null);

        var bestAccessibility = successful.stream()
                .max(Comparator.comparingInt(CompetitorComparisonResponse.CompetitorResult::getAccessibilityScore))
                .orElse(null);

        var bestPerformance = successful.stream()
                .max(Comparator.comparingInt(CompetitorComparisonResponse.CompetitorResult::getPerformanceScore))
                .orElse(null);

        double avgScore = successful.stream()
                .mapToInt(CompetitorComparisonResponse.CompetitorResult::getOverallScore)
                .average()
                .orElse(0.0);

        return CompetitorComparisonResponse.Summary.builder()
                .bestOverall(bestOverall.getUrl())
                .worstOverall(worstOverall.getUrl())
                .averageOverallScore(Math.round(avgScore * 100.0) / 100.0)
                .bestSeo(bestSeo != null ? bestSeo.getUrl() : null)
                .bestContent(bestContent != null ? bestContent.getUrl() : null)
                .bestAccessibility(bestAccessibility != null ? bestAccessibility.getUrl() : null)
                .bestPerformance(bestPerformance != null ? bestPerformance.getUrl() : null)
                .build();
    }
}
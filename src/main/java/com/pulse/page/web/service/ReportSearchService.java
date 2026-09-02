package com.pulse.page.web.service;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.dto.PlatformStatsResponse;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.mongo.AuditReportMongoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportSearchService {

    private final AuditReportMongoRepository mongoRepository;
    private final AuditReportJpaRepository jpaRepository;
    private final org.springframework.data.mongodb.core.MongoTemplate mongoTemplate;
    private final CacheService cacheService;

    @NonNull
    public Page<AuditReportDocument> searchSavedReports(@Nullable Pageable pageable) {
        Pageable validPageable = pageable != null ? pageable : Pageable.unpaged();
        try {
            return mongoRepository.findAll(validPageable);
        } catch (Exception e) {
            log.warn("MongoDB storage unavailable when retrieving saved reports ({}). Returning empty page.", e.getMessage());
            return Page.empty(validPageable);
        }
    }

    @NonNull
    public Optional<AuditReportDocument> getSavedReportById(@Nullable String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        try {
            return mongoRepository.findById(id);
        } catch (Exception e) {
            log.warn("MongoDB storage unavailable when retrieving report by ID '{}': {}", id, e.getMessage());
            return Optional.empty();
        }
    }

    public void deleteSavedReport(@NonNull String id) {
        Objects.requireNonNull(id, "id parameter must not be null");
        try {
            if (!mongoRepository.existsById(id)) {
                throw new ReportNotFoundException("Saved audit report with ID '" + id + "' not found.");
            }
            mongoRepository.deleteById(id);
            log.info("Deleted MongoDB saved report with ID {}", id);
        } catch (ReportNotFoundException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to delete report from MongoDB ({}).", e.getMessage());
            throw new ReportNotFoundException("Failed to delete report with ID '" + id + "' due to database error: " + e.getMessage());
        }
    }

    @NonNull
    public PlatformStatsResponse getPlatformStats() {
        if (cacheService != null) {
            Optional<PlatformStatsResponse> cached = cacheService.getCachedPlatformStats();
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        long totalTransient = 0L;
        try {
            totalTransient = jpaRepository.count();
        } catch (Exception e) {
            log.warn("Transient H2 count failed: {}", e.getMessage());
        }

        long totalSaved = 0L;
        double avgScore = 0.0;
        double avgResponseTime = 0.0;
        Map<String, Long> topDomains = new HashMap<>();

        try {
            if (mongoTemplate != null) {
                totalSaved = mongoTemplate.count(new org.springframework.data.mongodb.core.query.Query(), AuditReportDocument.class);

                if (totalSaved > 0) {
                    // Fast MongoDB aggregation for average score and response time
                    org.springframework.data.mongodb.core.aggregation.Aggregation avgAgg =
                            org.springframework.data.mongodb.core.aggregation.Aggregation.newAggregation(
                                    org.springframework.data.mongodb.core.aggregation.Aggregation.group()
                                            .avg("overallScore").as("avgScore")
                                            .avg("responseTimeMs").as("avgResponseTime")
                            );
                    org.springframework.data.mongodb.core.aggregation.AggregationResults<org.bson.Document> avgResults =
                            mongoTemplate.aggregate(avgAgg, AuditReportDocument.class, org.bson.Document.class);
                    org.bson.Document avgDoc = avgResults.getUniqueMappedResult();
                    if (avgDoc != null) {
                        Number scoreVal = avgDoc.get("avgScore", Number.class);
                        Number respVal = avgDoc.get("avgResponseTime", Number.class);
                        if (scoreVal != null) avgScore = scoreVal.doubleValue();
                        if (respVal != null) avgResponseTime = respVal.doubleValue();
                    }

                    // Fast MongoDB aggregation for top domains
                    org.springframework.data.mongodb.core.aggregation.Aggregation domainAgg =
                            org.springframework.data.mongodb.core.aggregation.Aggregation.newAggregation(
                                    org.springframework.data.mongodb.core.aggregation.Aggregation.match(
                                            org.springframework.data.mongodb.core.query.Criteria.where("domain").ne(null)),
                                     org.springframework.data.mongodb.core.aggregation.Aggregation.group("domain").count().as("count"),
                                    org.springframework.data.mongodb.core.aggregation.Aggregation.sort(
                                            org.springframework.data.domain.Sort.Direction.DESC, "count"),
                                    org.springframework.data.mongodb.core.aggregation.Aggregation.limit(10)
                            );
                    org.springframework.data.mongodb.core.aggregation.AggregationResults<org.bson.Document> domainResults =
                            mongoTemplate.aggregate(domainAgg, AuditReportDocument.class, org.bson.Document.class);
                    for (org.bson.Document doc : domainResults.getMappedResults()) {
                        String domain = doc.getString("_id");
                        Number count = doc.get("count", Number.class);
                        if (domain != null && count != null) {
                            topDomains.put(domain, count.longValue());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("MongoDB unavailable when retrieving platform stats ({}). Using fallback stats.", e.getMessage());
        }

        if (topDomains.isEmpty()) {
            topDomains = Map.of("example.com", totalTransient > 0 ? totalTransient : 1L);
        }

        PlatformStatsResponse response = PlatformStatsResponse.builder()
            .totalTransientAuditsRun(totalTransient)
            .totalSavedReports(totalSaved)
            .averageOverallScore(Math.round(avgScore * 100.0) / 100.0)
            .averageResponseTimeMs(Math.round(avgResponseTime * 100.0) / 100.0)
            .topDomains(topDomains)
            .build();

        if (cacheService != null) {
            cacheService.cachePlatformStats(response);
        }

        return response;
    }
}

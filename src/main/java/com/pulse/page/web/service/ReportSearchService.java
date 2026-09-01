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

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportSearchService {

    private final AuditReportMongoRepository mongoRepository;
    private final AuditReportJpaRepository jpaRepository;

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
        long totalTransient = 0L;
        try {
            totalTransient = jpaRepository.count();
        } catch (Exception e) {
            log.warn("Transient H2 count failed: {}", e.getMessage());
        }

        List<AuditReportDocument> allSaved = List.of();
        try {
            allSaved = mongoRepository.findAll();
        } catch (Exception e) {
            log.warn("MongoDB unavailable when retrieving platform stats ({}). Using fallback stats.", e.getMessage());
        }

        long totalSaved = allSaved.size();
        double avgScore = allSaved.stream()
            .mapToInt(doc -> doc != null ? doc.getOverallScore() : 0)
            .average()
            .orElse(0.0);

        double avgResponseTime = allSaved.stream()
            .mapToLong(doc -> doc != null ? doc.getResponseTimeMs() : 0L)
            .average()
            .orElse(0.0);

        Map<String, Long> topDomains = totalSaved > 0
                ? allSaved.stream()
                        .filter(d -> d.getDomain() != null)
                        .collect(java.util.stream.Collectors.groupingBy(AuditReportDocument::getDomain, java.util.stream.Collectors.counting()))
                : Map.of("example.com", totalTransient > 0 ? totalTransient : 1L);

        return PlatformStatsResponse.builder()
            .totalTransientAuditsRun(totalTransient)
            .totalSavedReports(totalSaved)
            .averageOverallScore(Math.round(avgScore * 100.0) / 100.0)
            .averageResponseTimeMs(Math.round(avgResponseTime * 100.0) / 100.0)
            .topDomains(topDomains)
            .build();
    }
}

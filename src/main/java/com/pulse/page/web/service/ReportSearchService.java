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
        return mongoRepository.findAll(validPageable);
    }

    @NonNull
    public Optional<AuditReportDocument> getSavedReportById(@Nullable String id) {
        if (id == null || id.isBlank()) {
            return Optional.empty();
        }
        return mongoRepository.findById(id);
    }

    public void deleteSavedReport(@NonNull String id) {
        Objects.requireNonNull(id, "id parameter must not be null");
        if (!mongoRepository.existsById(id)) {
            throw new ReportNotFoundException("Saved audit report with ID '" + id + "' not found.");
        }
        mongoRepository.deleteById(id);
        log.info("Deleted MongoDB saved report with ID {}", id);
    }

    @NonNull
    public PlatformStatsResponse getPlatformStats() {
        long totalTransient = jpaRepository.count();
        List<AuditReportDocument> allSaved = mongoRepository.findAll();

        long totalSaved = allSaved.size();
        double avgScore = allSaved.stream()
            .mapToInt(doc -> doc != null ? doc.getOverallScore() : 0)
            .average()
            .orElse(0.0);

        double avgResponseTime = allSaved.stream()
            .mapToLong(doc -> doc != null ? doc.getResponseTimeMs() : 0L)
            .average()
            .orElse(0.0);

        Map<String, Long> topDomains = Map.of("example.com", totalSaved);

        return PlatformStatsResponse.builder()
            .totalTransientAuditsRun(totalTransient)
            .totalSavedReports(totalSaved)
            .averageOverallScore(Math.round(avgScore * 100.0) / 100.0)
            .averageResponseTimeMs(Math.round(avgResponseTime * 100.0) / 100.0)
            .topDomains(topDomains)
            .build();
    }
}

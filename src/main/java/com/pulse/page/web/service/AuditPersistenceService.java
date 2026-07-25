package com.pulse.page.web.service;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.mongo.AuditReportMongoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditPersistenceService {

    private final AuditReportJpaRepository jpaRepository;
    private final AuditReportMongoRepository mongoRepository;

    @Transactional
    public AuditReportDocument saveAuditReportToMongo(Long tempId) {
        log.info("Migrating transient H2 audit report with ID {} to MongoDB Atlas", tempId);

        AuditReportEntity transientEntity = jpaRepository.findById(tempId)
            .orElseThrow(() -> new ReportNotFoundException("Temporary H2 audit report record with ID " + tempId + " not found."));

        AuditReportDocument document = AuditReportDocument.builder()
            .originalTempId(transientEntity.getId())
            .url(transientEntity.getUrl())
            .domain(transientEntity.getDomain())
            .httpStatus(transientEntity.getHttpStatus())
            .responseTimeMs(transientEntity.getResponseTimeMs())
            .pageTitle(transientEntity.getPageTitle())
            .metaDescription(transientEntity.getMetaDescription())
            .h1Count(transientEntity.getH1Count())
            .imagesMissingAltCount(transientEntity.getImagesMissingAltCount())
            .wordCount(transientEntity.getWordCount())
            .contentType(transientEntity.getContentType())
            .seoScore(transientEntity.getSeoScore())
            .contentScore(transientEntity.getContentScore())
            .accessibilityScore(transientEntity.getAccessibilityScore())
            .performanceScore(transientEntity.getPerformanceScore())
            .overallScore(transientEntity.getOverallScore())
            .healthGrade(transientEntity.getHealthGrade())
            .build();

        AuditReportDocument savedDocument = mongoRepository.save(document);
        jpaRepository.deleteById(tempId);

        log.info("Successfully saved report to MongoDB with ID {}", savedDocument.getId());
        return savedDocument;
    }
}

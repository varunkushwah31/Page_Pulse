package com.pulse.page.web.service;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.entity.UserEntity;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.jpa.UserRepository;
import com.pulse.page.web.repository.mongo.AuditReportMongoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditPersistenceService {

    private final AuditReportJpaRepository jpaRepository;
    private final AuditReportMongoRepository mongoRepository;
    private final UserRepository userRepository;

    @Transactional(rollbackFor = Exception.class)
    public AuditReportDocument saveAuditReportToMongo(Long tempId) {
        log.info("Migrating transient H2 audit report with ID {} to MongoDB Atlas", tempId);

        AuditReportEntity transientEntity = jpaRepository.findById(tempId)
            .orElseThrow(() -> new ReportNotFoundException("Temporary H2 audit report record with ID " + tempId + " not found."));

        Long userId = getCurrentUserId();

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
            .userId(userId)
            .build();

        AuditReportDocument savedDocument = mongoRepository.save(document);
        jpaRepository.deleteById(tempId);

        log.info("Successfully saved report to MongoDB with ID {} for user {}", savedDocument.getId(), userId);
        return savedDocument;
    }

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserEntity userEntity) {
            return userEntity.getId();
        }
        if (principal instanceof org.springframework.security.core.userdetails.UserDetails userDetails) {
            return userRepository.findByUsername(userDetails.getUsername()).map(UserEntity::getId).orElse(null);
        }
        return null;
    }
}

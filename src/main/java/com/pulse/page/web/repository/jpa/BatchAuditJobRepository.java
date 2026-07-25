package com.pulse.page.web.repository.jpa;

import com.pulse.page.web.entity.BatchAuditJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BatchAuditJobRepository extends JpaRepository<BatchAuditJobEntity, String> {
    Optional<BatchAuditJobEntity> findByJobId(String jobId);
    List<BatchAuditJobEntity> findAllByOrderBySubmittedAtDesc();
}

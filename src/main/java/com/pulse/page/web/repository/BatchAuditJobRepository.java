package com.pulse.page.web.repository;

import com.pulse.page.web.entity.BatchAuditJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BatchAuditJobRepository extends JpaRepository<BatchAuditJobEntity, String> {
    Optional<BatchAuditJobEntity> findByJobId(String jobId);
    List<BatchAuditJobEntity> findAllByOrderBySubmittedAtDesc();
}
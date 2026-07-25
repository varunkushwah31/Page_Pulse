package com.pulse.page.web.repository.jpa;

import com.pulse.page.web.entity.BatchAuditResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BatchAuditResultRepository extends JpaRepository<BatchAuditResultEntity, Long> {
    List<BatchAuditResultEntity> findByJobId(String jobId);

    @Query("SELECT COUNT(r) FROM BatchAuditResultEntity r WHERE r.jobId = :jobId AND r.status = 'SUCCESS'")
    long countSuccessfulResults(@Param("jobId") String jobId);

    @Query("SELECT COUNT(r) FROM BatchAuditResultEntity r WHERE r.jobId = :jobId AND r.status = 'FAILED'")
    long countFailedResults(@Param("jobId") String jobId);
}

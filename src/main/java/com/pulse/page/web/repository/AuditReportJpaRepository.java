package com.pulse.page.web.repository;

import com.pulse.page.web.entity.AuditReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditReportJpaRepository extends JpaRepository<AuditReportEntity, Long> {
}

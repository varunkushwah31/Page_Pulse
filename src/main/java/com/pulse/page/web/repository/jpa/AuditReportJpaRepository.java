package com.pulse.page.web.repository.jpa;

import com.pulse.page.web.entity.AuditReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditReportJpaRepository extends JpaRepository<AuditReportEntity, Long> {
}

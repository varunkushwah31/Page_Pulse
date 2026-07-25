package com.pulse.page.web.repository.jpa;

import com.pulse.page.web.entity.ScheduledAuditConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduledAuditConfigRepository extends JpaRepository<ScheduledAuditConfigEntity, Long> {
    List<ScheduledAuditConfigEntity> findByActiveTrue();
}

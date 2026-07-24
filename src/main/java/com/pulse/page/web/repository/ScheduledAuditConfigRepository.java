package com.pulse.page.web.repository;

import com.pulse.page.web.entity.ScheduledAuditConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduledAuditConfigRepository extends JpaRepository<ScheduledAuditConfigEntity, Long> {
    List<ScheduledAuditConfigEntity> findByActiveTrue();
}

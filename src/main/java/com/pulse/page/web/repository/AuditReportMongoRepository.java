package com.pulse.page.web.repository;

import com.pulse.page.web.document.AuditReportDocument;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditReportMongoRepository extends MongoRepository<AuditReportDocument, String> {
}

package com.pulse.page.web.repository.mongo;

import com.pulse.page.web.document.AuditReportDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditReportMongoRepository extends MongoRepository<AuditReportDocument, String> {
}

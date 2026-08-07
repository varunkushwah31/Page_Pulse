package com.pulse.page.web.repository.mongo;

import com.pulse.page.web.document.SitemapSnapshot;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SitemapSnapshotRepository extends MongoRepository<SitemapSnapshot, String> {

    List<SitemapSnapshot> findBySitemapUrlOrderByCrawlTimestampDesc(String sitemapUrl, Pageable pageable);
}

package com.pulse.page.web.repository.mongo;

import com.pulse.page.web.document.SeoCollectionDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface SeoCollectionMongoRepository extends MongoRepository<SeoCollectionDocument, String> {
    List<SeoCollectionDocument> findByUsernameOrderByUpdatedAtDesc(String username);
    List<SeoCollectionDocument> findByUserIdOrderByUpdatedAtDesc(Long userId);
    Optional<SeoCollectionDocument> findByIdAndUsername(String id, String username);
    Optional<SeoCollectionDocument> findByIdAndUserId(String id, Long userId);
}

package com.pulse.page.web.repository.jpa;

import com.pulse.page.web.entity.ApiKeyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ApiKeyRepository extends JpaRepository<ApiKeyEntity, String> {
    Optional<ApiKeyEntity> findByKeyHash(String keyHash);
    Optional<ApiKeyEntity> findByKeyPrefix(String keyPrefix);
    List<ApiKeyEntity> findByActiveTrue();
}

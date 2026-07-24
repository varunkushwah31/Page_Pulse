package com.pulse.page.web.repository;

import com.pulse.page.web.entity.ApiKeyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApiKeyRepository extends JpaRepository<ApiKeyEntity, String> {
    Optional<ApiKeyEntity> findByKeyHash(String keyHash);
    Optional<ApiKeyEntity> findByKeyPrefix(String keyPrefix);
    List<ApiKeyEntity> findByActiveTrue();
}
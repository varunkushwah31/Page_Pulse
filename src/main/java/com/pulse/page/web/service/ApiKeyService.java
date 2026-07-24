package com.pulse.page.web.service;

import com.pulse.page.web.dto.ApiKeyResponse;
import com.pulse.page.web.entity.ApiKeyEntity;
import com.pulse.page.web.exception.ApiKeyNotFoundException;
import com.pulse.page.web.repository.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ApiKeyResponse createApiKey(String name) {
        String rawKey = generateApiKey();
        String keyPrefix = "ppk_" + UUID.randomUUID().toString().substring(0, 8);
        String keyHash = passwordEncoder.encode(rawKey);

        ApiKeyEntity entity = ApiKeyEntity.builder()
                .id(UUID.randomUUID().toString())
                .name(name)
                .keyHash(keyHash)
                .keyPrefix(keyPrefix)
                .active(true)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(365L * 24 * 60 * 60))
                .build();

        apiKeyRepository.save(entity);
        log.info("Created API key: {} (prefix: {})", name, keyPrefix);

        return ApiKeyResponse.from(entity, rawKey);
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> getAllApiKeys() {
        return apiKeyRepository.findByActiveTrue().stream()
                .map(ApiKeyResponse::fromWithoutKey)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<ApiKeyEntity> validateApiKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            return Optional.empty();
        }

        String prefix = extractPrefix(rawKey);
        if (prefix == null) {
            return Optional.empty();
        }

        return apiKeyRepository.findByKeyPrefix(prefix)
                .filter(entity -> entity.isActive() && entity.getExpiresAt().isAfter(Instant.now()))
                .filter(entity -> passwordEncoder.matches(rawKey, entity.getKeyHash()))
                .map(entity -> {
                    entity.setLastUsedAt(Instant.now());
                    apiKeyRepository.save(entity);
                    return entity;
                });
    }

    @Transactional
    public boolean revokeApiKey(String id) {
        return apiKeyRepository.findById(id).map(entity -> {
            entity.setActive(false);
            apiKeyRepository.save(entity);
            log.info("Revoked API key: {}", id);
            return true;
        }).orElse(false);
    }

    @Transactional
    public boolean deleteApiKey(String id) {
        if (apiKeyRepository.existsById(id)) {
            apiKeyRepository.deleteById(id);
            log.info("Deleted API key: {}", id);
            return true;
        }
        return false;
    }

    private String generateApiKey() {
        return "ppk_" + UUID.randomUUID().toString().replace("-", "")
                + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    private String extractPrefix(String rawKey) {
        if (rawKey.startsWith("ppk_")) {
            int secondUnderscore = rawKey.indexOf('_', 4);
            if (secondUnderscore > 4) {
                return rawKey.substring(0, secondUnderscore + 1);
            }
        }
        return null;
    }
}
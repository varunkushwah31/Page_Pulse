package com.pulse.page.web.dto;

import com.pulse.page.web.entity.ApiKeyEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiKeyResponse {

    private String id;
    private String name;
    private String keyPrefix;
    private boolean active;
    private Instant createdAt;
    private Instant lastUsedAt;
    private Instant expiresAt;
    private String rawKey;

    public static ApiKeyResponse from(ApiKeyEntity entity, String rawKey) {
        return ApiKeyResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .keyPrefix(entity.getKeyPrefix())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .lastUsedAt(entity.getLastUsedAt())
                .expiresAt(entity.getExpiresAt())
                .rawKey(rawKey)
                .build();
    }

    public static ApiKeyResponse fromWithoutKey(ApiKeyEntity entity) {
        return ApiKeyResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .keyPrefix(entity.getKeyPrefix())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .lastUsedAt(entity.getLastUsedAt())
                .expiresAt(entity.getExpiresAt())
                .build();
    }
}
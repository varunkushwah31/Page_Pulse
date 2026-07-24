package com.pulse.page.web.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "api_keys")
public class ApiKeyEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 64)
    private String keyHash;

    @Column(length = 20)
    private String keyPrefix;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant lastUsedAt;

    @Builder.Default
    private Instant expiresAt = Instant.now().plusSeconds(365L * 24 * 60 * 60);

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID().toString();
        if (keyPrefix == null) keyPrefix = "ppk_" + UUID.randomUUID().toString().substring(0, 8);
    }
}
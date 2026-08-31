package com.pulse.page.web.dto;

import com.pulse.page.web.entity.UserEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private Long expiresIn;
    private UserInfo user;

    public static AuthResponse from(UserEntity user, String accessToken, String refreshToken, long expiresIn) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .user(UserInfo.from(user))
                .build();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private boolean hasGeminiApiKey;
        private String geminiApiKeyMasked;
        private String targetNiche;
        private String brandTone;
        private String targetCountry;
        private String primaryObjective;
        private String aiCreativityLevel;
        private String preferredAiModel;

        public static UserInfo from(UserEntity user) {
            boolean hasKey = user.getGeminiApiKey() != null && !user.getGeminiApiKey().isBlank();
            return UserInfo.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole().name())
                    .hasGeminiApiKey(hasKey)
                    .geminiApiKeyMasked(hasKey ? maskApiKey(user.getGeminiApiKey()) : null)
                    .targetNiche(user.getTargetNiche())
                    .brandTone(user.getBrandTone())
                    .targetCountry(user.getTargetCountry())
                    .primaryObjective(user.getPrimaryObjective())
                    .aiCreativityLevel(user.getAiCreativityLevel())
                    .preferredAiModel(user.getPreferredAiModel())
                    .build();
        }

        public static String maskApiKey(String key) {
            if (key == null || key.isBlank()) return null;
            if (key.length() <= 8) return "••••••••";
            return key.substring(0, 6) + "••••••••" + key.substring(key.length() - 4);
        }
    }
}
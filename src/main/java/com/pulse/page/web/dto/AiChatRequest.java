package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {
    private AuditResponse audit;
    private List<ChatMessage> conversationHistory;
    private String userMessage;
    private UserAiPreferencesRequest preferences;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        private String role;
        private String text;
    }
}

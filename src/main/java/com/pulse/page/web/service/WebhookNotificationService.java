package com.pulse.page.web.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookNotificationService {

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendRegressionAlert(String webhookUrl, String url, int previousScore, int currentScore, int scoreDrop, String correlationId) {
        Map<String, Object> payload = Map.of(
                "event", "SCORE_REGRESSION",
                "url", url,
                "previousScore", previousScore,
                "currentScore", currentScore,
                "scoreDrop", scoreDrop,
                "correlationId", correlationId,
                "timestamp", Instant.now().toString()
        );
        sendWebhook(webhookUrl, payload);
    }

    public void sendAuditCompletion(String webhookUrl, String url, int score, String status, String correlationId) {
        Map<String, Object> payload = Map.of(
                "event", "AUDIT_COMPLETED",
                "url", url,
                "overallScore", score,
                "status", status,
                "correlationId", correlationId,
                "timestamp", Instant.now().toString()
        );
        sendWebhook(webhookUrl, payload);
    }

    public void sendBatchAuditCompletion(String webhookUrl, String jobId, int totalUrls, int completed, int failed, String correlationId) {
        Map<String, Object> payload = Map.of(
                "event", "BATCH_AUDIT_COMPLETED",
                "jobId", jobId,
                "totalUrls", totalUrls,
                "completed", completed,
                "failed", failed,
                "correlationId", correlationId,
                "timestamp", Instant.now().toString()
        );
        sendWebhook(webhookUrl, payload);
    }

    private void sendWebhook(String webhookUrl, Map<String, Object> payload) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            restTemplate.postForEntity(webhookUrl, request, Void.class);
            log.info("Webhook sent successfully to: {}", webhookUrl);

        } catch (Exception e) {
            log.error("Failed to send webhook to {}: {}", webhookUrl, e.getMessage());
        }
    }
}
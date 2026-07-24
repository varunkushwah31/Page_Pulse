package com.pulse.page.web.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class WebhookNotificationEventListener {

    @Async
    @EventListener
    public void handleAuditCompleted(AuditCompletedEvent event) {
        log.info("Received AuditCompletedEvent for URL: {} (Overall Score: {})",
            event.getAuditResponse().getUrl(),
            event.getAuditResponse().getScores() != null ? event.getAuditResponse().getScores().getOverallScore() : "N/A");

        if (event.getWebhookUrl() != null && !event.getWebhookUrl().isBlank()) {
            log.info("Dispatching Webhook payload for completed audit to: {}", event.getWebhookUrl());
        }
    }

    @Async
    @EventListener
    public void handleScoreRegression(ScoreRegressionEvent event) {
        log.warn("ALERT: ScoreRegressionEvent detected for URL {}! Score dropped from {} to {} (Drop of {} points)",
            event.getUrl(), event.getPreviousScore(), event.getCurrentScore(), event.getScoreDrop());

        if (event.getWebhookUrl() != null && !event.getWebhookUrl().isBlank()) {
            log.warn("Dispatching CRITICAL Webhook regression alert payload to: {}", event.getWebhookUrl());
        }
    }
}

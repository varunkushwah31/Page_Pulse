package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.ScheduledAuditConfigEntity;
import com.pulse.page.web.event.ScoreRegressionEvent;
import com.pulse.page.web.repository.jpa.ScheduledAuditConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledAuditService {

    private static final int DEFAULT_REGRESSION_THRESHOLD = 15;

    private final ScheduledAuditConfigRepository configRepository;
    private final AuditReportProcessorService processorService;
    private final ApplicationEventPublisher eventPublisher;
    private final WebhookNotificationService webhookNotificationService;

    @Transactional
    public ScheduledAuditConfigEntity registerSchedule(String url, String webhookUrl, String email, int frequencyMinutes, int regressionThreshold, boolean notifyOnRegressionOnly) {
        ScheduledAuditConfigEntity config = ScheduledAuditConfigEntity.builder()
                .url(url)
                .webhookUrl(webhookUrl)
                .email(email)
                .frequencyMinutes(frequencyMinutes > 0 ? frequencyMinutes : 60)
                .regressionThreshold(regressionThreshold > 0 ? regressionThreshold : DEFAULT_REGRESSION_THRESHOLD)
                .notifyOnRegressionOnly(notifyOnRegressionOnly)
                .active(true)
                .build();
        return configRepository.save(config);
    }

    @Transactional(readOnly = true)
    public List<ScheduledAuditConfigEntity> getAllSchedules() {
        return configRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<ScheduledAuditConfigEntity> getSchedule(Long id) {
        return configRepository.findById(id);
    }

    @Transactional
    public Optional<ScheduledAuditConfigEntity> updateSchedule(Long id, String webhookUrl, String email, int frequencyMinutes, int regressionThreshold, boolean notifyOnRegressionOnly) {
        return configRepository.findById(id).map(config -> {
            if (webhookUrl != null) config.setWebhookUrl(webhookUrl);
            if (email != null) config.setEmail(email);
            if (frequencyMinutes > 0) config.setFrequencyMinutes(frequencyMinutes);
            if (regressionThreshold > 0) config.setRegressionThreshold(regressionThreshold);
            config.setNotifyOnRegressionOnly(notifyOnRegressionOnly);
            config.setUpdatedAt(Instant.now());
            return configRepository.save(config);
        });
    }

    @Transactional
    public boolean deleteSchedule(Long id) {
        return configRepository.findById(id).map(config -> {
            configRepository.delete(config);
            return true;
        }).orElse(false);
    }

    @Scheduled(fixedRate = 60000)
    public void executeScheduledScans() {
        List<ScheduledAuditConfigEntity> activeConfigs = configRepository.findByActiveTrue();
        if (activeConfigs.isEmpty()) {
            return;
        }

        Instant now = Instant.now();
        for (ScheduledAuditConfigEntity config : activeConfigs) {
            if (isDueForAudit(config, now)) {
                runScheduledAudit(config, now);
            }
        }
    }

    private boolean isDueForAudit(ScheduledAuditConfigEntity config, Instant now) {
        if (config.getLastAuditTime() == null) {
            return true;
        }
        long minutesElapsed = (now.toEpochMilli() - config.getLastAuditTime().toEpochMilli()) / (60 * 1000);
        return minutesElapsed >= config.getFrequencyMinutes();
    }

    private void runScheduledAudit(ScheduledAuditConfigEntity config, Instant now) {
        String correlationId = UUID.randomUUID().toString();
        log.info("Executing scheduled recurring audit for URL: {} (correlationId: {})", config.getUrl(), correlationId);
        try {
            AuditResponse response = processorService.processAudit(config.getUrl());
            int currentScore = response.getScores() != null ? response.getScores().getOverallScore() : 0;

            if (config.getPreviousOverallScore() != null) {
                processScoreComparison(config, currentScore, correlationId);
            } else {
                notifyBaselineCompletion(config, currentScore, correlationId);
            }

            config.setPreviousOverallScore(currentScore);
            config.setLastAuditTime(now);
            config.setUpdatedAt(now);
            configRepository.save(config);

        } catch (Exception e) {
            log.error("Scheduled audit failed for URL {}: {}", config.getUrl(), e.getMessage());
            if (config.getWebhookUrl() != null && !config.getWebhookUrl().isBlank()) {
                webhookNotificationService.sendAuditCompletion(
                        config.getWebhookUrl(), config.getUrl(), 0, "FAILED", correlationId
                );
            }
        }
    }

    private void processScoreComparison(ScheduledAuditConfigEntity config, int currentScore, String correlationId) {
        int previousScore = config.getPreviousOverallScore();
        int scoreDrop = previousScore - currentScore;
        if (scoreDrop >= config.getRegressionThreshold()) {
            log.warn("Score regression detected for {}: previous={}, current={}, drop={} (threshold: {})",
                    config.getUrl(), previousScore, currentScore, scoreDrop, config.getRegressionThreshold());

            eventPublisher.publishEvent(new ScoreRegressionEvent(
                    this, config.getUrl(), previousScore, currentScore, scoreDrop, config.getWebhookUrl()
            ));

            if (config.getWebhookUrl() != null && !config.getWebhookUrl().isBlank()) {
                webhookNotificationService.sendRegressionAlert(
                        config.getWebhookUrl(), config.getUrl(), previousScore, currentScore, scoreDrop, correlationId
                );
            }
        } else if (!config.isNotifyOnRegressionOnly() && config.getWebhookUrl() != null) {
            webhookNotificationService.sendAuditCompletion(
                    config.getWebhookUrl(), config.getUrl(), currentScore, "STABLE", correlationId
            );
        }
    }

    private void notifyBaselineCompletion(ScheduledAuditConfigEntity config, int currentScore, String correlationId) {
        if (config.getWebhookUrl() != null && !config.getWebhookUrl().isBlank()) {
            webhookNotificationService.sendAuditCompletion(
                    config.getWebhookUrl(), config.getUrl(), currentScore, "BASELINE", correlationId
            );
        }
    }
}

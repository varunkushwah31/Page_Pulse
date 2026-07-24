package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.ScheduledAuditConfigEntity;
import com.pulse.page.web.event.ScoreRegressionEvent;
import com.pulse.page.web.repository.ScheduledAuditConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduledAuditService {

    private static final int REGRESSION_THRESHOLD_POINTS = 15;

    private final ScheduledAuditConfigRepository configRepository;
    private final AuditReportProcessorService processorService;
    private final ApplicationEventPublisher eventPublisher;

    public ScheduledAuditConfigEntity registerSchedule(String url, String webhookUrl, int frequencyMinutes) {
        ScheduledAuditConfigEntity config = ScheduledAuditConfigEntity.builder()
            .url(url)
            .webhookUrl(webhookUrl)
            .frequencyMinutes(frequencyMinutes > 0 ? frequencyMinutes : 60)
            .active(true)
            .build();
        return configRepository.save(config);
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
        log.info("Executing scheduled recurring audit for URL: {}", config.getUrl());
        try {
            AuditResponse response = processorService.processAudit(config.getUrl());
            int currentScore = response.getScores() != null ? response.getScores().getOverallScore() : 0;

            if (config.getPreviousOverallScore() != null) {
                int previousScore = config.getPreviousOverallScore();
                int scoreDrop = previousScore - currentScore;
                if (scoreDrop >= REGRESSION_THRESHOLD_POINTS) {
                    log.warn("Score regression detected for {}: previous={}, current={}, drop={}",
                        config.getUrl(), previousScore, currentScore, scoreDrop);

                    eventPublisher.publishEvent(new ScoreRegressionEvent(
                        this, config.getUrl(), previousScore, currentScore, scoreDrop, config.getWebhookUrl()
                    ));
                }
            }

            config.setPreviousOverallScore(currentScore);
            config.setLastAuditTime(now);
            configRepository.save(config);

        } catch (Exception e) {
            log.error("Scheduled audit failed for URL {}: {}", config.getUrl(), e.getMessage());
        }
    }
}

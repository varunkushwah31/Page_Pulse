package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.ScheduledAuditConfigEntity;
import com.pulse.page.web.event.ScoreRegressionEvent;
import com.pulse.page.web.model.AuditScoreBreakdown;
import com.pulse.page.web.repository.jpa.ScheduledAuditConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScheduledAuditServiceTest {

    @Mock
    private ScheduledAuditConfigRepository configRepository;

    @Mock
    private AuditReportProcessorService processorService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private WebhookNotificationService webhookNotificationService;

    private ScheduledAuditService scheduledAuditService;

    @BeforeEach
    void setUp() {
        scheduledAuditService = new ScheduledAuditService(configRepository, processorService, eventPublisher, webhookNotificationService);
    }

    @Test
    void registerSchedule_savesNewConfig() {
        ScheduledAuditConfigEntity config = ScheduledAuditConfigEntity.builder()
            .id(1L)
            .url("https://example.com")
            .frequencyMinutes(30)
            .active(true)
            .build();

        when(configRepository.save(any())).thenReturn(config);

        ScheduledAuditConfigEntity saved = scheduledAuditService.registerSchedule("https://example.com", null, null, 30, 15, true);
        assertNotNull(saved);
        assertEquals("https://example.com", saved.getUrl());
    }

    @Test
    void executeScheduledScans_detectsScoreRegression_publishesEvent() throws IOException {
        ScheduledAuditConfigEntity config = ScheduledAuditConfigEntity.builder()
            .id(1L)
            .url("https://example.com")
            .webhookUrl("https://webhook.site/test")
            .frequencyMinutes(60)
            .previousOverallScore(95)
            .active(true)
            .build();

        when(configRepository.findByActiveTrue()).thenReturn(List.of(config));

        AuditScoreBreakdown droppedScores = AuditScoreBreakdown.builder()
            .overallScore(70) // Drop of 25 points (> 15 points)
            .build();

        AuditResponse response = AuditResponse.builder()
            .url("https://example.com")
            .scores(droppedScores)
            .build();

        when(processorService.processAudit("https://example.com")).thenReturn(response);

        scheduledAuditService.executeScheduledScans();

        ArgumentCaptor<ScoreRegressionEvent> eventCaptor = ArgumentCaptor.forClass(ScoreRegressionEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());

        ScoreRegressionEvent publishedEvent = eventCaptor.getValue();
        assertEquals("https://example.com", publishedEvent.getUrl());
        assertEquals(95, publishedEvent.getPreviousScore());
        assertEquals(70, publishedEvent.getCurrentScore());
        assertEquals(25, publishedEvent.getScoreDrop());
    }
}

package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditProgress;
import com.pulse.page.web.dto.AuditResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditProgressStreamService {

    private final AuditReportProcessorService processorService;

    public SseEmitter streamAuditProgress(String rawUrl) {
        SseEmitter emitter = new SseEmitter(30000L);

        try (ExecutorService executor = Executors.newSingleThreadExecutor()) {
            executor.submit(() -> {
                try {
                    sendStep(emitter, "INIT", 10, "Validating URL syntax & scheme...");
                    sleepUninterrupted(100);

                    sendStep(emitter, "FETCH", 30, "Fetching HTML DOM & headers...");
                    sleepUninterrupted(100);

                    sendStep(emitter, "EXTRACT", 60, "Extracting SEO, Content, Accessibility, Performance metrics...");
                    sleepUninterrupted(100);

                    sendStep(emitter, "SCORE", 85, "Calculating weighted quality scores...");
                    AuditResponse response = processorService.processAudit(rawUrl);

                    sendStep(emitter, "COMPLETE", 100, "Audit completed successfully!");
                    emitter.send(SseEmitter.event().name("result").data(response));
                    emitter.complete();

                } catch (Exception e) {
                    log.error("Error streaming SSE progress for {}: {}", rawUrl, e.getMessage());
                    try {
                        emitter.send(SseEmitter.event().name("error").data(e.getMessage()));
                    } catch (Exception _) {
                        // Intentionally ignore emitter send failures during error handling
                    }
                    emitter.completeWithError(e);
                }
            });
        }

        return emitter;
    }

    private void sleepUninterrupted(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
        }
    }

    private void sendStep(SseEmitter emitter, String step, int percentage, String message) throws IOException {
        AuditProgress progress = AuditProgress.builder()
            .step(step)
            .percentage(percentage)
            .message(message)
            .build();
        emitter.send(SseEmitter.event().name("progress").data(progress));
    }
}

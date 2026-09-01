package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.engine.UrlValidationEngine;
import com.pulse.page.web.exception.SiteLookException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditProgressStreamService {

    private static final String EVENT_PROGRESS = "PROGRESS";
    private static final String KEY_PROGRESS = "progress";
    private static final String KEY_MESSAGE = "message";
    private static final String KEY_STEP = "step";

    private final UrlValidationEngine urlValidationEngine;
    private final AuditReportProcessorService processorService;

    public SseEmitter streamAuditProgress(String rawUrl, boolean enableJsRendering) {
        SseEmitter emitter = new SseEmitter(45000L);

        Thread.startVirtualThread(() -> {
            try {
                String normalizedUrl = urlValidationEngine.validateAndNormalize(rawUrl);

                sendEvent(emitter, EVENT_PROGRESS, Map.of(
                    KEY_PROGRESS, 15,
                    KEY_STEP, "SCRAPING_DOM",
                    KEY_MESSAGE, enableJsRendering ? "Launching Headless Chromium Playwright Engine..." : "Scraping static DOM HTML over HTTP/2..."
                ));

                sendEvent(emitter, EVENT_PROGRESS, Map.of(
                    KEY_PROGRESS, 40,
                    KEY_STEP, "EXTRACTING_METRICS",
                    KEY_MESSAGE, "Parsing DOM tree for SEO metadata, heading hierarchy, and Core Web Vitals..."
                ));

                sendEvent(emitter, EVENT_PROGRESS, Map.of(
                    KEY_PROGRESS, 65,
                    KEY_STEP, "INSPECTING_ASSETS",
                    KEY_MESSAGE, "Inspecting web fonts, image CLS dimensions, and external links..."
                ));

                AuditResponse auditResponse = processorService.processAudit(normalizedUrl, enableJsRendering);

                sendEvent(emitter, EVENT_PROGRESS, Map.of(
                    KEY_PROGRESS, 90,
                    KEY_STEP, "CALCULATING_SCORES",
                    KEY_MESSAGE, "Computing 4-way health scores and generating AI recommendations..."
                ));

                sendEvent(emitter, "COMPLETE", Map.of(
                    KEY_PROGRESS, 100,
                    KEY_STEP, "COMPLETE",
                    KEY_MESSAGE, "Audit completed successfully.",
                    "data", auditResponse
                ));

                emitter.complete();

            } catch (SiteLookException e) {
                log.warn("Streaming audit failed for URL {}: {}", rawUrl, e.getMessage());
                sendErrorEvent(emitter, e.getStatus().value(), e.getErrorCode(), e.getMessage());
            } catch (Exception e) {
                log.error("Streaming audit unexpected failure for URL {}", rawUrl, e);
                sendErrorEvent(emitter, 500, "AUDIT_STREAM_FAILED", "Audit execution failed: " + e.getMessage());
            }
        });

        return emitter;
    }

    private void sendEvent(SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException e) {
            log.debug("SSE client disconnected prematurely: {}", e.getMessage());
            emitter.completeWithError(e);
        }
    }

    private void sendErrorEvent(SseEmitter emitter, int status, String errorCode, String message) {
        try {
            emitter.send(SseEmitter.event().name("ERROR").data(Map.of(
                "status", status,
                "error", errorCode,
                KEY_MESSAGE, message
            )));
            emitter.complete();
        } catch (IOException e) {
            log.debug("Failed to send SSE error event: {}", e.getMessage());
            emitter.complete();
        }
    }
}

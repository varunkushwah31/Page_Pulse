package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.engine.PageScraperEngine;
import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.engine.PlaywrightScraperEngine;
import com.pulse.page.web.engine.UrlValidationEngine;
import com.pulse.page.web.exception.PagePulseException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditProgressStreamService {

    private final UrlValidationEngine urlValidationEngine;
    private final PageScraperEngine pageScraperEngine;
    private final PlaywrightScraperEngine playwrightScraperEngine;
    private final AuditReportProcessorService processorService;

    public SseEmitter streamAuditProgress(String rawUrl, boolean enableJsRendering) {
        SseEmitter emitter = new SseEmitter(45000L);

        Executors.newVirtualThreadPerTaskExecutor().submit(() -> {
            try {
                String normalizedUrl = urlValidationEngine.validateAndNormalize(rawUrl);

                sendEvent(emitter, "PROGRESS", Map.of(
                    "progress", 15,
                    "step", "SCRAPING_DOM",
                    "message", enableJsRendering ? "Launching Headless Chromium Playwright Engine..." : "Scraping static DOM HTML over HTTP/2..."
                ));

                ScrapeResult scrapeResult;
                if (enableJsRendering) {
                    scrapeResult = playwrightScraperEngine.fetchPageWithJs(normalizedUrl);
                } else {
                    scrapeResult = pageScraperEngine.fetchPage(normalizedUrl);
                }

                sendEvent(emitter, "PROGRESS", Map.of(
                    "progress", 40,
                    "step", "EXTRACTING_METRICS",
                    "message", "Parsing DOM tree for SEO metadata, heading hierarchy, and Core Web Vitals..."
                ));

                sendEvent(emitter, "PROGRESS", Map.of(
                    "progress", 65,
                    "step", "INSPECTING_ASSETS",
                    "message", "Inspecting web fonts, image CLS dimensions, and external links..."
                ));

                AuditResponse auditResponse = processorService.processAudit(normalizedUrl, enableJsRendering);

                sendEvent(emitter, "PROGRESS", Map.of(
                    "progress", 90,
                    "step", "CALCULATING_SCORES",
                    "message", "Computing 4-way health scores and generating AI recommendations..."
                ));

                sendEvent(emitter, "COMPLETE", Map.of(
                    "progress", 100,
                    "step", "COMPLETE",
                    "message", "Audit completed successfully.",
                    "data", auditResponse
                ));

                emitter.complete();

            } catch (PagePulseException e) {
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
                "message", message
            )));
            emitter.complete();
        } catch (IOException ignored) {
            emitter.complete();
        }
    }
}

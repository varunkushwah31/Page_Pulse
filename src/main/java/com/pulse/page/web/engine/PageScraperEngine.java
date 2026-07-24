package com.pulse.page.web.engine;

import com.pulse.page.web.exception.AuditTimeoutException;
import com.pulse.page.web.exception.NonHtmlContentException;
import com.pulse.page.web.exception.TargetHostUnreachableException;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;

@Slf4j
@Component
public class PageScraperEngine {

    private static final int TIMEOUT_MS = 5000;
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PagePulse/2.0 Enterprise Engine";

    @Getter
    @Builder
    public static class ScrapeResult {
        private String targetUrl;
        private int statusCode;
        private long responseTimeMs;
        private String contentType;
        private Document document;
    }

    public ScrapeResult fetchPage(String targetUrl) throws IOException {
        log.info("Fetching target page for audit: {}", targetUrl);

        long startTime = System.currentTimeMillis();
        try {
            Connection connection = Jsoup.connect(targetUrl)
                .timeout(TIMEOUT_MS)
                .userAgent(USER_AGENT)
                .followRedirects(true)
                .ignoreHttpErrors(true);

            Connection.Response response = connection.execute();
            long responseTimeMs = System.currentTimeMillis() - startTime;

            String contentType = response.contentType();
            if (contentType == null || !contentType.toLowerCase().contains("text/html")) {
                log.warn("Non-HTML response encountered for URL {}: {}", targetUrl, contentType);
                throw new NonHtmlContentException(
                    "Target URL content type '" + (contentType != null ? contentType : "unknown") + 
                    "' is not text/html. Scraper execution aborted."
                );
            }

            Document document = response.parse();

            return ScrapeResult.builder()
                .targetUrl(targetUrl)
                .statusCode(response.statusCode())
                .responseTimeMs(responseTimeMs)
                .contentType(contentType)
                .document(document)
                .build();

        } catch (SocketTimeoutException e) {
            log.error("Socket timeout after 5000ms while fetching {}", targetUrl);
            throw new AuditTimeoutException("Target URL fetch timed out after 5000ms: " + targetUrl, e);
        } catch (UnknownHostException e) {
            log.error("Unknown host DNS error for {}", targetUrl);
            throw new TargetHostUnreachableException("DNS host resolution failed for target URL: " + targetUrl, e);
        } catch (ConnectException e) {
            log.error("Connection refused for {}", targetUrl);
            throw new TargetHostUnreachableException("Connection refused by target server: " + targetUrl, e);
        }
    }
}

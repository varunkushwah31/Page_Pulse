package com.pulse.page.web.engine;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.exception.TargetHostUnreachableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Slf4j
@Component
@RequiredArgsConstructor
public class PlaywrightScraperEngine {

    private static final int TIMEOUT_MS = 10000;
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

    private final PageScraperEngine pageScraperEngine;

    public ScrapeResult fetchPageWithJs(String targetUrl) throws IOException {
        log.info("Fetching target page with JS rendering requested: {}", targetUrl);

        try {
            CompletableFuture<ScrapeResult> future = CompletableFuture.supplyAsync(() -> executePlaywrightScrape(targetUrl));
            return future.get(5, TimeUnit.SECONDS);
        } catch (TimeoutException _) {
            log.warn("Playwright JS rendering timed out for URL: {}, falling back to standard HTTP scraper", targetUrl);
            return pageScraperEngine.fetchPage(targetUrl);
        } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
            log.warn("Playwright execution interrupted for URL: {}, falling back to standard HTTP scraper", targetUrl);
            return pageScraperEngine.fetchPage(targetUrl);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            log.warn("Playwright headless browser engine unavailable or failed on host ({}). Gracefully falling back to standard HTTP scraper for URL: {}", cause.getMessage(), targetUrl);
            return pageScraperEngine.fetchPage(targetUrl);
        } catch (Exception e) {
            log.warn("Playwright execution failed ({}). Falling back to standard HTTP scraper for URL: {}", e.getMessage(), targetUrl);
            return pageScraperEngine.fetchPage(targetUrl);
        }
    }

    private ScrapeResult executePlaywrightScrape(String targetUrl) {
        long startTime = System.currentTimeMillis();

        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(true));
            Browser.NewContextOptions contextOptions = new Browser.NewContextOptions()
                    .setUserAgent(USER_AGENT)
                    .setViewportSize(1280, 800);

            try (var context = browser.newContext(contextOptions); var page = context.newPage()) {
                page.setDefaultNavigationTimeout(TIMEOUT_MS);
                var response = page.navigate(targetUrl);

                if (response == null) {
                    throw new TargetHostUnreachableException("Failed to navigate to target URL: " + targetUrl);
                }

                waitForDomLoadState(page, targetUrl);

                long responseTimeMs = System.currentTimeMillis() - startTime;
                String htmlContent = page.content();
                int statusCode = response.status();
                String contentType = response.headers().getOrDefault("content-type", "text/html");

                Map<String, String> headers = new HashMap<>(response.headers());
                Document document = Jsoup.parse(htmlContent, targetUrl);

                return ScrapeResult.builder()
                        .targetUrl(targetUrl)
                        .statusCode(statusCode)
                        .responseTimeMs(responseTimeMs)
                        .contentType(contentType)
                        .responseHeaders(headers)
                        .document(document)
                        .build();

            } finally {
                browser.close();
            }
        }
    }

    private void waitForDomLoadState(Page page, String targetUrl) {
        try {
            page.waitForLoadState(com.microsoft.playwright.options.LoadState.NETWORKIDLE, new Page.WaitForLoadStateOptions().setTimeout(3000));
        } catch (Exception e) {
            log.debug("Network idle timeout reached for {}, proceeding with rendered DOM: {}", targetUrl, e.getMessage());
        }
    }
}

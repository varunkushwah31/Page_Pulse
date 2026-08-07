package com.pulse.page.web.engine;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;

import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.exception.AuditTimeoutException;
import com.pulse.page.web.exception.TargetHostUnreachableException;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class PlaywrightScraperEngine {

    private static final int TIMEOUT_MS = 15000;
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

    public ScrapeResult fetchPageWithJs(String targetUrl) throws IOException {
        log.info("Fetching target page with Playwright JS rendering: {}", targetUrl);

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
        } catch (com.microsoft.playwright.TimeoutError e) {
            log.error("Playwright navigation timed out for {}", targetUrl, e);
            throw new AuditTimeoutException("Playwright JS rendering timed out after 15000ms: " + targetUrl, e);
        } catch (Exception e) {
            log.error("Playwright scraping error for {}: {}", targetUrl, e.getMessage(), e);
            if (e instanceof RuntimeException re) {
                throw re;
            }
            throw new TargetHostUnreachableException("Playwright headless browser error for target URL: " + targetUrl, e);
        }
    }

    private void waitForDomLoadState(Page page, String targetUrl) {
        try {
            page.waitForLoadState(com.microsoft.playwright.options.LoadState.NETWORKIDLE, new Page.WaitForLoadStateOptions().setTimeout(5000));
        } catch (Exception e) {
            log.debug("Network idle timeout reached for {}, proceeding with rendered DOM: {}", targetUrl, e.getMessage());
        }
    }
}

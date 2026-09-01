package com.pulse.page.web.engine;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.LoadState;
import com.microsoft.playwright.options.WaitUntilState;
import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.exception.TargetHostUnreachableException;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
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

    private static final int EXECUTION_TIMEOUT_SECONDS = 15;
    private static final int NAVIGATION_TIMEOUT_MS = 12000;
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 SiteLook/2.0 SPA-Engine";

    private final PageScraperEngine pageScraperEngine;

    private Playwright playwright;
    private Browser browser;
    private boolean isAvailable = true;

    private synchronized Browser getOrCreateBrowser() {
        if (!isAvailable) {
            return null;
        }
        if (browser == null || !browser.isConnected()) {
            try {
                if (playwright == null) {
                    playwright = Playwright.create();
                }
                browser = playwright.chromium().launch(new BrowserType.LaunchOptions().setHeadless(true));
                log.info("Playwright Chromium headless browser initialized successfully.");
            } catch (Exception e) {
                log.warn("Playwright headless browser failed to initialize: {}. Disabling Playwright and falling back to standard scraper.", e.getMessage());
                isAvailable = false;
                closeResources();
                return null;
            }
        }
        return browser;
    }

    public ScrapeResult fetchPageWithJs(String targetUrl) throws IOException {
        log.info("Fetching target page with JS rendering requested: {}", targetUrl);

        try {
            CompletableFuture<ScrapeResult> future = CompletableFuture.supplyAsync(() -> executePlaywrightScrape(targetUrl));
            return future.get(EXECUTION_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException _) {
            log.warn("Playwright JS rendering timed out ({}s) for URL: {}, falling back to standard HTTP scraper", EXECUTION_TIMEOUT_SECONDS, targetUrl);
            return pageScraperEngine.fetchPage(targetUrl);
        } catch (InterruptedException _) {
            Thread.currentThread().interrupt();
            log.warn("Playwright execution interrupted for URL: {}, falling back to standard HTTP scraper", targetUrl);
            return pageScraperEngine.fetchPage(targetUrl);
        } catch (ExecutionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            log.warn("Playwright execution error ({}) for URL: {}. Gracefully falling back to standard HTTP scraper.", cause.getMessage(), targetUrl);
            return pageScraperEngine.fetchPage(targetUrl);
        } catch (Exception e) {
            log.warn("Playwright execution failed ({}) for URL: {}. Falling back to standard HTTP scraper.", e.getMessage(), targetUrl);
            return pageScraperEngine.fetchPage(targetUrl);
        }
    }

    private ScrapeResult executePlaywrightScrape(String targetUrl) {
        Browser activeBrowser = getOrCreateBrowser();
        if (activeBrowser == null) {
            throw new IllegalStateException("Playwright Chromium browser is not available on this host");
        }

        long startTime = System.currentTimeMillis();

        Browser.NewContextOptions contextOptions = new Browser.NewContextOptions()
                .setUserAgent(USER_AGENT)
                .setViewportSize(1280, 800)
                .setJavaScriptEnabled(true);

        try (var context = activeBrowser.newContext(contextOptions); var page = context.newPage()) {
            page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
            page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

            var response = page.navigate(targetUrl, new Page.NavigateOptions()
                    .setWaitUntil(WaitUntilState.DOMCONTENTLOADED)
                    .setTimeout(NAVIGATION_TIMEOUT_MS));

            if (response == null) {
                throw new TargetHostUnreachableException("Failed to navigate to target URL: " + targetUrl);
            }

            waitForSpaDomSettled(page, targetUrl);

            long responseTimeMs = System.currentTimeMillis() - startTime;
            String htmlContent = page.content();
            int statusCode = response.status();
            String contentType = response.headers().getOrDefault("content-type", "text/html");

            Map<String, String> headers = new HashMap<>(response.headers());
            Document document = Jsoup.parse(htmlContent, targetUrl);

            String spaFramework = detectSpaFramework(document, page);

            log.info("[PLAYWRIGHT SPA SCRAPE] Completed in {}ms | Status: {} | Framework: {}",
                    responseTimeMs, statusCode, spaFramework != null ? spaFramework : "Standard JS");

            return ScrapeResult.builder()
                    .targetUrl(targetUrl)
                    .statusCode(statusCode)
                    .responseTimeMs(responseTimeMs)
                    .contentType(contentType)
                    .responseHeaders(headers)
                    .document(document)
                    .jsRendered(true)
                    .spaFramework(spaFramework)
                    .jsExecutionTimeMs(responseTimeMs)
                    .build();
        }
    }

    private void waitForSpaDomSettled(Page page, String targetUrl) {
        try {
            page.waitForLoadState(LoadState.LOAD, new Page.WaitForLoadStateOptions().setTimeout(4000));
        } catch (Exception e) {
            log.debug("Load state timeout reached for {}: {}", targetUrl, e.getMessage());
        }

        try {
            page.waitForLoadState(LoadState.NETWORKIDLE, new Page.WaitForLoadStateOptions().setTimeout(3000));
        } catch (Exception e) {
            log.debug("Network idle timeout reached for {}, proceeding with rendered DOM: {}", targetUrl, e.getMessage());
        }

        // Brief delay to allow microtask/state transitions in React/Vue/Angular to complete
        try {
            page.waitForTimeout(300);
        } catch (Exception _) {
            // ignore
        }
    }

    public String detectSpaFramework(Document doc, Page page) {
        if (doc == null) return null;

        // Next.js
        if (doc.selectFirst("#__next, script#__NEXT_DATA__") != null) {
            return "React (Next.js)";
        }

        // Nuxt.js
        if (doc.selectFirst("#__nuxt, script#__NUXT_DATA__") != null) {
            return "Vue (Nuxt.js)";
        }

        // Remix
        if (doc.selectFirst("script[id*='remix'], script:containsData(__remixContext)") != null) {
            return "React (Remix)";
        }

        // Svelte / SvelteKit
        if (doc.selectFirst("[class*='svelte-'], [id*='svelte']") != null) {
            return "Svelte / SvelteKit";
        }

        // Angular
        if (doc.selectFirst("[ng-version], [ng-app], app-root, [ng-reflect-]") != null) {
            Element el = doc.selectFirst("[ng-version]");
            String version = el != null ? el.attr("ng-version") : "";
            return version.isBlank() ? "Angular" : "Angular v" + version;
        }

        // Astro
        if (doc.selectFirst("astro-island, [data-astro-cid]") != null) {
            return "Astro";
        }

        // Vue.js
        if (doc.selectFirst("[data-v-], #app:not(:empty)") != null) {
            return "Vue.js";
        }

        // React
        if (doc.selectFirst("[data-reactroot], [data-react-helmet], #root:not(:empty)") != null) {
            return "React";
        }

        // General Client-Side App
        if (doc.selectFirst("#spa-root, #app-root, [data-app], #main-app") != null) {
            return "SPA / Client App";
        }

        return "JavaScript Rendered";
    }

    @PreDestroy
    public synchronized void closeResources() {
        if (browser != null) {
            try {
                browser.close();
            } catch (Exception e) {
                log.debug("Error closing Playwright browser: {}", e.getMessage());
            }
            browser = null;
        }
        if (playwright != null) {
            try {
                playwright.close();
            } catch (Exception e) {
                log.debug("Error closing Playwright instance: {}", e.getMessage());
            }
            playwright = null;
        }
    }
}

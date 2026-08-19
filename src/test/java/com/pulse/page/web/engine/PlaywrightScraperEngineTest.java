package com.pulse.page.web.engine;

import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlaywrightScraperEngineTest {

    @Mock
    private PageScraperEngine pageScraperEngine;

    private PlaywrightScraperEngine playwrightScraperEngine;

    @BeforeEach
    void setUp() {
        playwrightScraperEngine = new PlaywrightScraperEngine(pageScraperEngine);
    }

    @Test
    void fetchPageWithJsFallsBackToPageScraperEngineWhenPlaywrightFails() throws IOException {
        Document doc = Jsoup.parse("<html><head><title>Fallback Page</title></head><body><h1>Hello</h1></body></html>");
        ScrapeResult fallbackResult = ScrapeResult.builder()
                .targetUrl("https://example.com")
                .statusCode(200)
                .responseTimeMs(120L)
                .contentType("text/html")
                .responseHeaders(Map.of("content-type", "text/html"))
                .document(doc)
                .build();

        when(pageScraperEngine.fetchPage("https://example.com")).thenReturn(fallbackResult);

        ScrapeResult result = playwrightScraperEngine.fetchPageWithJs("https://example.com");

        assertNotNull(result);
        assertEquals("https://example.com", result.getTargetUrl());
        assertEquals(200, result.getStatusCode());
        assertEquals("Fallback Page", result.getDocument().title());
        verify(pageScraperEngine, atLeastOnce()).fetchPage("https://example.com");
    }
}

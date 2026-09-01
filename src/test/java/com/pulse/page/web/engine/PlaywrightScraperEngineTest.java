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

    @Test
    void detectSpaFrameworkCorrectlyIdentifiesFrameworks() {
        Document nextDoc = Jsoup.parse("<html><head><script id=\"__NEXT_DATA__\"></script></head><body><div id=\"__next\"></div></body></html>");
        assertEquals("React (Next.js)", playwrightScraperEngine.detectSpaFramework(nextDoc, null));

        Document nuxtDoc = Jsoup.parse("<html><head><script id=\"__NUXT_DATA__\"></script></head><body><div id=\"__nuxt\"></div></body></html>");
        assertEquals("Vue (Nuxt.js)", playwrightScraperEngine.detectSpaFramework(nuxtDoc, null));

        Document remixDoc = Jsoup.parse("<html><head><script>window.__remixContext={};</script></head><body><div id=\"root\"></div></body></html>");
        assertEquals("React (Remix)", playwrightScraperEngine.detectSpaFramework(remixDoc, null));

        Document svelteDoc = Jsoup.parse("<html><body><main class=\"svelte-1abc23\">Svelte</main></body></html>");
        assertEquals("Svelte / SvelteKit", playwrightScraperEngine.detectSpaFramework(svelteDoc, null));

        Document angularDoc = Jsoup.parse("<html><body><app-root ng-version=\"18.0.0\"></app-root></body></html>");
        assertEquals("Angular v18.0.0", playwrightScraperEngine.detectSpaFramework(angularDoc, null));

        Document astroDoc = Jsoup.parse("<html><body><astro-island></astro-island></body></html>");
        assertEquals("Astro", playwrightScraperEngine.detectSpaFramework(astroDoc, null));

        Document reactDoc = Jsoup.parse("<html><body><div id=\"root\" data-reactroot=\"\"><p>App</p></div></body></html>");
        assertEquals("React", playwrightScraperEngine.detectSpaFramework(reactDoc, null));

        Document vueDoc = Jsoup.parse("<html><body><div id=\"app\" data-v-123456><p>Vue App</p></div></body></html>");
        assertEquals("Vue.js", playwrightScraperEngine.detectSpaFramework(vueDoc, null));

        Document genericDoc = Jsoup.parse("<html><body><div id=\"spa-root\"><p>Generic Content</p></div></body></html>");
        assertEquals("SPA / Client App", playwrightScraperEngine.detectSpaFramework(genericDoc, null));

        Document plainDoc = Jsoup.parse("<html><body><p>Plain Static HTML</p></body></html>");
        assertEquals("JavaScript Rendered", playwrightScraperEngine.detectSpaFramework(plainDoc, null));
    }
}

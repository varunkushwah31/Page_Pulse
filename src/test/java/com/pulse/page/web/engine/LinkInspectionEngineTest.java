package com.pulse.page.web.engine;

import com.pulse.page.web.model.LinkInspectionMetrics;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LinkInspectionEngineTest {

    private LinkInspectionEngine linkEngine;

    @BeforeEach
    void setUp() {
        linkEngine = new LinkInspectionEngine();
    }

    @Test
    void inspectLinks_validDocumentWithLinks_returnsMetrics() {
        Document doc = Jsoup.parse("<html><body><a href=\"https://example.com/about\">About Us</a><a href=\"https://google.com\">Search</a></body></html>");

        LinkInspectionMetrics metrics = linkEngine.inspectLinks("https://example.com", doc);

        assertNotNull(metrics);
        assertEquals(2, metrics.getTotalLinksFound());
    }
}

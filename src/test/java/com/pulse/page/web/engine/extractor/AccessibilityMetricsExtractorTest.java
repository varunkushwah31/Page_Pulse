package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.AccessibilityMetrics;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AccessibilityMetricsExtractorTest {

    private AccessibilityMetricsExtractor extractor;

    @BeforeEach
    void setUp() {
        extractor = new AccessibilityMetricsExtractor();
    }

    @Test
    void extract_validAccessibleDoc_extractsAllA11yAttributes() {
        String html = """
            <!DOCTYPE html>
            <html lang="en" dir="ltr">
            <body>
                <header role="banner"><nav role="navigation"><a href="/">Home</a></nav></header>
                <main id="main" role="main">
                    <h1>Accessible Platform</h1>
                    <img src="chart.png" alt="Quarterly SEO score growth chart" width="600" height="300">
                    <form>
                        <label for="email-input">Email Address</label>
                        <input id="email-input" type="email" name="email">
                        <button type="submit">Submit Request</button>
                    </form>
                </main>
                <footer role="contentinfo"><p>Copyright 2026</p></footer>
            </body>
            </html>
            """;

        Document doc = Jsoup.parse(html);
        AccessibilityMetrics metrics = extractor.extract(doc);

        assertNotNull(metrics);
        assertTrue(metrics.isHasHtmlLangAttribute());
        assertEquals("en", metrics.getHtmlLangValue());
        assertTrue(metrics.isValidLangCode());
        assertEquals(0, metrics.getImagesMissingAltCount());
        assertEquals(0, metrics.getFormInputsMissingLabelsCount());
        assertEquals(0, metrics.getButtonsMissingAccessibleNameCount());
        assertTrue(metrics.isHasMainLandmark());
        assertTrue(metrics.isHasHeaderLandmark());
        assertTrue(metrics.isHasNavLandmark());
        assertTrue(metrics.isHasFooterLandmark());
        assertTrue(metrics.isHasTextDirection());
        assertEquals("ltr", metrics.getTextDirectionValue());
        assertEquals(0, metrics.getPositiveTabindexCount());
    }

    @Test
    void extract_missingAltAndNamelessButton_flagsViolations() {
        String html = """
            <!DOCTYPE html>
            <html>
            <body>
                <img src="banner.jpg">
                <button type="button"><svg></svg></button>
                <input type="text" name="query">
                <div tabindex="5">Disrupted focus</div>
            </body>
            </html>
            """;

        Document doc = Jsoup.parse(html);
        AccessibilityMetrics metrics = extractor.extract(doc);

        assertNotNull(metrics);
        assertFalse(metrics.isHasHtmlLangAttribute());
        assertEquals(1, metrics.getImagesMissingAltCount());
        assertEquals(1, metrics.getButtonsMissingAccessibleNameCount());
        assertEquals(1, metrics.getFormInputsMissingLabelsCount());
        assertEquals(1, metrics.getPositiveTabindexCount());
        assertFalse(metrics.getWcagViolationsSummary().isEmpty());
    }
}

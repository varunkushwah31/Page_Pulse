package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.ContentMetrics;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ContentMetricsExtractorTest {

    private ContentMetricsExtractor extractor;

    @BeforeEach
    void setUp() {
        extractor = new ContentMetricsExtractor();
    }

    @Test
    void extract_validContentWithHeadings_extractsReadabilityAndHierarchy() {
        String html = """
            <!DOCTYPE html>
            <html>
            <body>
                <h1>Main Enterprise Product Overview</h1>
                <p>SiteLook is an advanced web auditing platform engineered for modern technical teams. It delivers comprehensive analysis across performance, search engine optimization, content readability, accessibility, and link infrastructure.</p>
                <h2>Core Architecture Capabilities</h2>
                <p>The platform inspects critical web vitals, detects DOM hierarchy regressions, and extracts actionable recommendations.</p>
                <p>Users can automate audit workflows with scheduled cron jobs and push notifications.</p>
                <h3>Security and Infrastructure</h3>
                <p>Full SSL certificate validation and security header audits protect client domains.</p>
                <a href="https://example.com/learn">read more</a>
            </body>
            </html>
            """;

        Document doc = Jsoup.parse(html);
        ContentMetrics metrics = extractor.extract(doc);

        assertNotNull(metrics);
        assertEquals(1, metrics.getHeadingCounts().get("h1"));
        assertEquals(1, metrics.getHeadingCounts().get("h2"));
        assertEquals(1, metrics.getHeadingCounts().get("h3"));
        assertEquals(3, metrics.getHeadingHierarchy().size());
        assertTrue(metrics.isHasValidHeadingHierarchy());
        assertTrue(metrics.getWordCount() > 50);

        // Readability metrics
        assertNotNull(metrics.getReadabilityMetrics());
        assertTrue(metrics.getReadabilityMetrics().getFleschKincaidReadingEase() >= 0.0);
        assertNotNull(metrics.getReadabilityMetrics().getReadingEaseLevel());

        // Generic anchor check
        assertFalse(metrics.getGenericAnchorWarnings().isEmpty());
    }

    @Test
    void extract_skippedHeadingLevel_flagsHierarchyIssue() {
        String html = """
            <!DOCTYPE html>
            <html>
            <body>
                <h1>Main Heading</h1>
                <h3>Skipped H2 Directly to H3</h3>
            </body>
            </html>
            """;

        Document doc = Jsoup.parse(html);
        ContentMetrics metrics = extractor.extract(doc);

        assertNotNull(metrics);
        assertFalse(metrics.isHasValidHeadingHierarchy());
        assertTrue(metrics.getHeadingIssues().stream().anyMatch(issue -> issue.contains("skipped")));
    }
}

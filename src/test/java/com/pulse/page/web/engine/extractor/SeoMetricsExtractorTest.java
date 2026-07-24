package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.SeoMetrics;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SeoMetricsExtractorTest {

    private SeoMetricsExtractor extractor;

    @BeforeEach
    void setUp() {
        extractor = new SeoMetricsExtractor();
    }

    @Test
    void extract_validHtmlDoc_extractsAllSeoAttributes() {
        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Awesome Enterprise Web Tool</title>
                <meta name="description" content="This is an enterprise web auditing platform test description.">
                <meta name="keywords" content="seo, audit, springboot">
                <link rel="canonical" href="https://example.com/canonical-page" />
                <meta property="og:title" content="OG Enterprise Title" />
                <meta property="og:image" content="https://example.com/og.png" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="robots" content="index, follow" />
            </head>
            <body>
                <h1>Header</h1>
            </body>
            </html>
            """;

        Document doc = Jsoup.parse(html, "https://example.com");
        SeoMetrics metrics = extractor.extract(doc);

        assertNotNull(metrics);
        assertEquals("Awesome Enterprise Web Tool", metrics.getPageTitle());
        assertTrue(metrics.isHasTitle());
        assertEquals("This is an enterprise web auditing platform test description.", metrics.getMetaDescription());
        assertTrue(metrics.isHasMetaDescription());
        assertEquals("seo, audit, springboot", metrics.getMetaKeywords());
        assertEquals("https://example.com/canonical-page", metrics.getCanonicalUrl());
        assertEquals("OG Enterprise Title", metrics.getOpenGraphTags().get("og:title"));
        assertEquals("summary_large_image", metrics.getTwitterCardTags().get("twitter:card"));
        assertTrue(metrics.isIndexable());
        assertTrue(metrics.isFollowable());
    }
}

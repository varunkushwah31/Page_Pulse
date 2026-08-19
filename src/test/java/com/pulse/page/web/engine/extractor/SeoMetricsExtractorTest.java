package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.SeoMetrics;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;

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
                <link rel="alternate" hreflang="en-US" href="https://example.com/en" />
                <link rel="alternate" hreflang="x-default" href="https://example.com" />
                <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": "SEO Best Practices",
                    "author": "Antigravity",
                    "datePublished": "2026-08-19"
                }
                </script>
            </head>
            <body>
                <h1>Header</h1>
            </body>
            </html>
            """;

        Document doc = Jsoup.parse(html, "https://example.com");
        SeoMetrics metrics = extractor.extract(doc, "https://example.com", Map.of("x-robots-tag", "all"));

        assertNotNull(metrics);
        assertEquals("Awesome Enterprise Web Tool", metrics.getPageTitle());
        assertTrue(metrics.isHasTitle());
        assertEquals("This is an enterprise web auditing platform test description.", metrics.getMetaDescription());
        assertTrue(metrics.isHasMetaDescription());
        assertEquals("seo, audit, springboot", metrics.getMetaKeywords());
        assertEquals("https://example.com/canonical-page", metrics.getCanonicalUrl());
        assertEquals("SELF_REFERENCING", metrics.getCanonicalStatus());
        assertEquals("OG Enterprise Title", metrics.getOpenGraphTags().get("og:title"));
        assertEquals("summary_large_image", metrics.getTwitterCardTags().get("twitter:card"));
        assertTrue(metrics.isIndexable());
        assertTrue(metrics.isFollowable());

        // Hreflang & Schema validation
        assertTrue(metrics.isHasXDefaultHreflang());
        assertEquals(2, metrics.getHreflangTags().size());
        assertNotNull(metrics.getStructuredDataInfo());
        assertTrue(metrics.getStructuredDataInfo().isHasStructuredData());
        assertTrue(metrics.getStructuredDataInfo().isValidJsonLd());
        assertTrue(metrics.getStructuredDataInfo().getDetectedSchemaTypes().contains("Article"));

        // SERP Preview
        assertNotNull(metrics.getSerpPreview());
        assertEquals("Awesome Enterprise Web Tool", metrics.getSerpPreview().getDisplayedTitle());
        assertFalse(metrics.getSerpPreview().isTitleTruncated());
    }

    @Test
    void extract_malformedJsonLd_capturesValidationError() {
        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Malformed Test</title>
                <script type="application/ld+json">
                { "bad_json": true,
                </script>
            </head>
            <body></body>
            </html>
            """;

        Document doc = Jsoup.parse(html, "https://example.com");
        SeoMetrics metrics = extractor.extract(doc);

        assertNotNull(metrics.getStructuredDataInfo());
        assertTrue(metrics.getStructuredDataInfo().isHasStructuredData());
        assertFalse(metrics.getStructuredDataInfo().isValidJsonLd());
        assertFalse(metrics.getStructuredDataInfo().getValidationErrors().isEmpty());
    }
}

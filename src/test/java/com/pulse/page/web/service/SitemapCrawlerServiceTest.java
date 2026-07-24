package com.pulse.page.web.service;

import com.pulse.page.web.engine.UrlValidationEngine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SitemapCrawlerServiceTest {

    @Mock
    private UrlValidationEngine urlValidationEngine;

    @Mock
    private AuditReportProcessorService processorService;

    private SitemapCrawlerService sitemapCrawlerService;

    @BeforeEach
    void setUp() {
        sitemapCrawlerService = new SitemapCrawlerService(urlValidationEngine, processorService);
    }

    @Test
    void auditSitemap_invalidUrl_throwsIllegalArgumentException() throws IOException {
        when(urlValidationEngine.validateAndNormalize(anyString()))
            .thenThrow(new IllegalArgumentException("Invalid sitemap URL"));

        assertThrows(IllegalArgumentException.class, () ->
            sitemapCrawlerService.auditSitemap("https://example.com/invalid.xml", 5)
        );
    }
}

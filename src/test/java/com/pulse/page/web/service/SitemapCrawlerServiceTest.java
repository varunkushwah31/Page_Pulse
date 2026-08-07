package com.pulse.page.web.service;

import com.pulse.page.web.engine.UrlValidationEngine;
import com.pulse.page.web.repository.mongo.SitemapSnapshotRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SitemapCrawlerServiceTest {

    @Mock
    private UrlValidationEngine urlValidationEngine;

    @Mock
    private AuditReportProcessorService processorService;

    @Mock
    private SitemapSnapshotRepository sitemapSnapshotRepository;

    @InjectMocks
    private SitemapCrawlerService sitemapCrawlerService;

    @Test
    void auditSitemap_invalidUrl_throwsIllegalArgumentException() {
        when(urlValidationEngine.validateAndNormalize(anyString()))
            .thenThrow(new IllegalArgumentException("Invalid sitemap URL"));

        assertThrows(IllegalArgumentException.class, () ->
            sitemapCrawlerService.auditSitemap("https://example.com/invalid.xml", 5)
        );
    }
}

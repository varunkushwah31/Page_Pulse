package com.pulse.page.web.controller;

import com.pulse.page.web.dto.SitemapAuditRequest;
import com.pulse.page.web.dto.SitemapAuditResponse;
import com.pulse.page.web.service.SitemapCrawlerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/sitemap")
@RequiredArgsConstructor
public class SitemapController {

    private final SitemapCrawlerService sitemapCrawlerService;

    @PostMapping("/audit")
    public ResponseEntity<SitemapAuditResponse> auditSitemap(@Valid @RequestBody SitemapAuditRequest request) throws IOException {
        SitemapAuditResponse response = sitemapCrawlerService.auditSitemap(request.getSitemapUrl(), request.getMaxUrls());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/delta")
    public ResponseEntity<com.pulse.page.web.dto.SitemapDeltaResponse> getSitemapDelta(@RequestParam("sitemapUrl") String sitemapUrl) {
        com.pulse.page.web.dto.SitemapDeltaResponse delta = sitemapCrawlerService.computeDelta(sitemapUrl);
        return ResponseEntity.ok(delta);
    }
}

package com.pulse.page.web.controller;

import com.pulse.page.web.dto.KeywordGapResponse;
import com.pulse.page.web.engine.KeywordGapEngine;
import com.pulse.page.web.engine.PageScraperEngine;
import com.pulse.page.web.engine.PageScraperEngine.ScrapeResult;
import com.pulse.page.web.engine.UrlValidationEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/competitor")
@RequiredArgsConstructor
public class CompetitorController {

    private final UrlValidationEngine urlValidationEngine;
    private final PageScraperEngine pageScraperEngine;
    private final KeywordGapEngine keywordGapEngine;

    @GetMapping("/keyword-gap")
    public ResponseEntity<KeywordGapResponse> computeKeywordGap(
            @RequestParam("urlA") String urlA,
            @RequestParam("urlB") String urlB) throws IOException {

        String normA = urlValidationEngine.validateAndNormalize(urlA);
        String normB = urlValidationEngine.validateAndNormalize(urlB);

        ScrapeResult scrapeA = pageScraperEngine.fetchPage(normA);
        ScrapeResult scrapeB = pageScraperEngine.fetchPage(normB);

        KeywordGapResponse response = keywordGapEngine.computeKeywordGap(
            normA, scrapeA.getDocument(),
            normB, scrapeB.getDocument()
        );

        return ResponseEntity.ok(response);
    }
}

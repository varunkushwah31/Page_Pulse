package com.pulse.page.web.controller;

import com.pulse.page.web.dto.CompetitorComparisonRequest;
import com.pulse.page.web.dto.CompetitorComparisonResponse;
import com.pulse.page.web.service.CompetitorComparisonService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/competitor-comparison")
@RequiredArgsConstructor
public class CompetitorComparisonController {

    private final CompetitorComparisonService competitorComparisonService;

    @PostMapping
    public ResponseEntity<CompetitorComparisonResponse> compareCompetitors(@Valid @RequestBody CompetitorComparisonRequest request) {
        CompetitorComparisonResponse response = competitorComparisonService.compareCompetitors(request);
        return ResponseEntity.ok(response);
    }
}
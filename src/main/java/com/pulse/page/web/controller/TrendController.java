package com.pulse.page.web.controller;

import com.pulse.page.web.dto.TrendResponse;
import com.pulse.page.web.service.TrendService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class TrendController {

    private final TrendService trendService;

    @GetMapping("/{domain}/trends")
    public ResponseEntity<TrendResponse> getTrend(
            @PathVariable("domain") String domain,
            @RequestParam(required = false, defaultValue = "overallScore") String metric,
            @RequestParam(required = false, defaultValue = "30") Integer days,
            @RequestParam(required = false, defaultValue = "100") Integer limit) {

        TrendResponse response = trendService.getTrend(domain, metric, days, limit);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{domain}/trends/all")
    public ResponseEntity<List<TrendResponse>> getAllTrends(
            @PathVariable("domain") String domain,
            @RequestParam(required = false, defaultValue = "30") Integer days,
            @RequestParam(required = false, defaultValue = "100") Integer limit) {

        List<TrendResponse> responses = trendService.getAllMetricsTrend(domain, days, limit);
        return ResponseEntity.ok(responses);
    }
}
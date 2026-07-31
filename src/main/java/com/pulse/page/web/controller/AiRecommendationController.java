package com.pulse.page.web.controller;

import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.service.AiRecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiRecommendationController {

    private final AiRecommendationService recommendationService;

    @PostMapping("/recommendations")
    public ResponseEntity<List<AiRecommendationDto>> getAiFixRecommendations(@RequestBody AuditResponse audit) {
        List<AiRecommendationDto> recommendations = recommendationService.generateRecommendations(audit);
        return ResponseEntity.ok(recommendations);
    }
}

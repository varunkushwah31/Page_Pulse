package com.pulse.page.web.controller;

import com.pulse.page.web.dto.AuthResponse;
import com.pulse.page.web.dto.GeminiKeyRequest;
import com.pulse.page.web.dto.GeminiValidationResponse;
import com.pulse.page.web.entity.UserEntity;
import com.pulse.page.web.exception.AuthenticationException;
import com.pulse.page.web.repository.jpa.UserRepository;
import com.pulse.page.web.service.GeminiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserRepository userRepository;
    private final GeminiService geminiService;

    @GetMapping("/profile")
    public ResponseEntity<AuthResponse.UserInfo> getUserProfile(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new AuthenticationException("Authentication required");
        }

        UserEntity user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new AuthenticationException("User not found: " + userDetails.getUsername()));

        return ResponseEntity.ok(AuthResponse.UserInfo.from(user));
    }

    @PutMapping("/gemini-key")
    public ResponseEntity<AuthResponse.UserInfo> updateGeminiApiKey(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody GeminiKeyRequest request) {
        if (userDetails == null) {
            throw new AuthenticationException("Authentication required");
        }

        UserEntity user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new AuthenticationException("User not found: " + userDetails.getUsername()));

        String key = request != null && request.getApiKey() != null ? request.getApiKey().trim() : null;
        user.setGeminiApiKey(key != null && !key.isEmpty() ? key : null);
        userRepository.save(user);

        log.info("Updated Gemini API key for user: {}", user.getUsername());
        return ResponseEntity.ok(AuthResponse.UserInfo.from(user));
    }

    @DeleteMapping("/gemini-key")
    public ResponseEntity<AuthResponse.UserInfo> removeGeminiApiKey(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new AuthenticationException("Authentication required");
        }

        UserEntity user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new AuthenticationException("User not found: " + userDetails.getUsername()));

        user.setGeminiApiKey(null);
        userRepository.save(user);

        log.info("Removed Gemini API key for user: {}", user.getUsername());
        return ResponseEntity.ok(AuthResponse.UserInfo.from(user));
    }

    @PostMapping("/gemini-key/validate")
    public ResponseEntity<GeminiValidationResponse> validateGeminiApiKey(
            @Valid @RequestBody GeminiKeyRequest request) {
        String key = request != null ? request.getApiKey() : null;
        GeminiValidationResponse response = geminiService.validateApiKey(key);
        return ResponseEntity.ok(response);
    }
}

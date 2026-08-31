package com.pulse.page.web.controller;

import com.pulse.page.web.dto.AuthResponse;
import com.pulse.page.web.dto.LoginRequest;
import com.pulse.page.web.dto.RegisterRequest;
import com.pulse.page.web.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final com.pulse.page.web.repository.jpa.UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.badRequest().build();
        }
        String refreshToken = authHeader.substring(7);
        AuthResponse response = authService.refreshToken(refreshToken);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserInfo> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return userRepository.findByUsername(userDetails.getUsername())
                .map(u -> ResponseEntity.ok(AuthResponse.UserInfo.from(u)))
                .orElseGet(() -> ResponseEntity.ok(AuthResponse.UserInfo.builder()
                        .username(userDetails.getUsername())
                        .role(userDetails.getAuthorities().stream()
                                .findFirst()
                                .map(a -> a.getAuthority().replace("ROLE_", ""))
                                .orElse("USER"))
                        .build()));
    }
}
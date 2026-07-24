package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuthResponse;
import com.pulse.page.web.dto.LoginRequest;
import com.pulse.page.web.dto.RegisterRequest;
import com.pulse.page.web.entity.UserEntity;
import com.pulse.page.web.exception.AuthenticationException;
import com.pulse.page.web.repository.UserRepository;
import com.pulse.page.web.security.JwtUtil;
import com.pulse.page.web.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsServiceImpl userDetailsService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AuthenticationException("Username already exists: " + request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AuthenticationException("Email already exists: " + request.getEmail());
        }

        UserEntity user = UserEntity.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(UserEntity.Role.USER)
                .build();

        userRepository.save(user);
        log.info("New user registered: {}", user.getUsername());

        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String usernameOrEmail = request.getUsernameOrEmail();
        
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(usernameOrEmail, request.getPassword())
            );
            
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            UserEntity user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new AuthenticationException("User not found after authentication"));

            user.setLastLoginAt(java.time.Instant.now());
            userRepository.save(user);

            return generateAuthResponse(user);
        } catch (BadCredentialsException e) {
            throw new AuthenticationException("Invalid username/email or password");
        }
    }

    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new AuthenticationException("Invalid or expired refresh token");
        }

        String username = jwtUtil.extractUsername(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        
        if (!jwtUtil.validateToken(refreshToken, userDetails)) {
            throw new AuthenticationException("Invalid refresh token");
        }

        String newAccessToken = jwtUtil.generateToken(userDetails);
        String newRefreshToken = jwtUtil.generateRefreshToken(userDetails);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpirationMs())
                .build();
    }

    private AuthResponse generateAuthResponse(UserEntity user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
        String accessToken = jwtUtil.generateToken(userDetails);
        String refreshToken = jwtUtil.generateRefreshToken(userDetails);
        return AuthResponse.from(user, accessToken, refreshToken, jwtUtil.getExpirationMs());
    }
}
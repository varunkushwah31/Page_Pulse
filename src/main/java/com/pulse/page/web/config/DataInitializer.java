package com.pulse.page.web.config;

import com.pulse.page.web.entity.UserEntity;
import com.pulse.page.web.repository.jpa.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Seed Admin Demo Account
        if (!userRepository.existsByUsername("admin")) {
            UserEntity admin = UserEntity.builder()
                    .username("admin")
                    .email("admin@sitelook.dev")
                    .password(passwordEncoder.encode("Admin@123456"))
                    .fullName("Platform Administrator")
                    .role(UserEntity.Role.ADMIN)
                    .build();
            userRepository.save(admin);
            log.info("Seeded mock admin user: admin / admin@sitelook.dev");
        }

        // Seed Developer Demo Account
        if (!userRepository.existsByUsername("devuser")) {
            UserEntity devUser = UserEntity.builder()
                    .username("devuser")
                    .email("dev@sitelook.dev")
                    .password(passwordEncoder.encode("Dev@123456"))
                    .fullName("Senior Developer")
                    .role(UserEntity.Role.USER)
                    .build();
            userRepository.save(devUser);
            log.info("Seeded mock developer user: devuser / dev@sitelook.dev");
        }
    }
}

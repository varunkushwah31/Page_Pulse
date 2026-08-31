package com.pulse.page.web.controller;

import com.pulse.page.web.dto.GeminiKeyRequest;
import com.pulse.page.web.entity.UserEntity;
import com.pulse.page.web.repository.jpa.UserRepository;
import com.pulse.page.web.service.GeminiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private GeminiService geminiService;

    @InjectMocks
    private UserController userController;

    private UserDetails userDetails;
    private UserEntity userEntity;

    @BeforeEach
    void setUp() {
        userDetails = new User("testuser", "password", Collections.emptyList());
        userEntity = UserEntity.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .fullName("Test User")
                .role(UserEntity.Role.USER)
                .geminiApiKey("AIzaSyTest1234567890")
                .build();
    }

    @Test
    void getUserProfile_returnsProfileWithMaskedGeminiKey() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));

        var response = userController.getUserProfile(userDetails);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isHasGeminiApiKey());
        assertNotNull(response.getBody().getGeminiApiKeyMasked());
        assertTrue(response.getBody().getGeminiApiKeyMasked().contains("••••"));
    }

    @Test
    void updateGeminiApiKey_updatesAndReturnsUserInfo() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(i -> i.getArgument(0));

        GeminiKeyRequest request = new GeminiKeyRequest("AIzaSyNewKey1234567890");
        var response = userController.updateGeminiApiKey(userDetails, request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isHasGeminiApiKey());
        verify(userRepository).save(userEntity);
        assertEquals("AIzaSyNewKey1234567890", userEntity.getGeminiApiKey());
    }

    @Test
    void removeGeminiApiKey_clearsAndReturnsUserInfo() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(i -> i.getArgument(0));

        var response = userController.removeGeminiApiKey(userDetails);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isHasGeminiApiKey());
        assertNull(userEntity.getGeminiApiKey());
        verify(userRepository).save(userEntity);
    }

    @Test
    void updateAiPreferences_savesAndReturnsUpdatedProfile() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(i -> i.getArgument(0));

        com.pulse.page.web.dto.UserAiPreferencesRequest request = com.pulse.page.web.dto.UserAiPreferencesRequest.builder()
                .targetNiche("SaaS & B2B Tech")
                .brandTone("Authoritative & Professional")
                .targetCountry("Global / International")
                .primaryObjective("Maximize Organic CTR & Rankings")
                .aiCreativityLevel("BALANCED")
                .preferredAiModel("gemini-2.0-flash")
                .build();

        var response = userController.updateAiPreferences(userDetails, request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("SaaS & B2B Tech", response.getBody().getTargetNiche());
        assertEquals("Authoritative & Professional", response.getBody().getBrandTone());
        verify(userRepository).save(userEntity);
    }

    @Test
    void getUserGeminiModels_returnsModelsList() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(geminiService.fetchAvailableModelsDetailed("AIzaSyTest1234567890")).thenReturn(java.util.List.of(
                com.pulse.page.web.dto.GeminiModelDto.builder()
                        .id("gemini-2.0-flash")
                        .displayName("Gemini 2.0 Flash")
                        .isRecommended(true)
                        .build()
        ));
        when(geminiService.resolveOptimalModel(any())).thenReturn("gemini-2.0-flash");

        var response = userController.getUserGeminiModels(userDetails);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("gemini-2.0-flash", response.getBody().getActiveModel());
        assertEquals(1, response.getBody().getModels().size());
    }
}
package com.pulse.page.web.controller;

import com.pulse.page.web.dto.*;
import com.pulse.page.web.entity.UserEntity;
import com.pulse.page.web.repository.jpa.UserRepository;
import com.pulse.page.web.service.SeoCollectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/collections")
@RequiredArgsConstructor
public class SeoCollectionController {

    private final SeoCollectionService collectionService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<SeoCollectionDto>> getUserCollections(@AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.getUserCollections(username));
    }

    @PostMapping
    public ResponseEntity<SeoCollectionDto> createCollection(
            @Valid @RequestBody CreateSeoCollectionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        Long userId = getUserId(username);
        return ResponseEntity.ok(collectionService.createCollection(request, username, userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SeoCollectionDto> getCollectionById(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.getCollectionById(id, username));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SeoCollectionDto> updateCollection(
            @PathVariable String id,
            @Valid @RequestBody UpdateSeoCollectionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.updateCollection(id, request, username));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCollection(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        collectionService.deleteCollection(id, username);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<SeoCollectionDto> duplicateCollection(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.duplicateCollection(id, username));
    }

    @PostMapping("/{id}/items")
    public ResponseEntity<SeoCollectionDto> addItem(
            @PathVariable String id,
            @Valid @RequestBody CreateSeoCollectionItemRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.addItem(id, request, username));
    }

    @PutMapping("/{id}/items/{itemId}")
    public ResponseEntity<SeoCollectionDto> updateItem(
            @PathVariable String id,
            @PathVariable String itemId,
            @Valid @RequestBody UpdateSeoCollectionItemRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.updateItem(id, itemId, request, username));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ResponseEntity<SeoCollectionDto> deleteItem(
            @PathVariable String id,
            @PathVariable String itemId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.deleteItem(id, itemId, username));
    }

    @PostMapping("/{id}/items/{itemId}/run")
    public ResponseEntity<SeoCollectionDto> runItem(
            @PathVariable String id,
            @PathVariable String itemId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.runSingleItem(id, itemId, username));
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<CollectionRunResultDto> runCollection(
            @PathVariable String id,
            @RequestBody(required = false) CollectionRunRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        return ResponseEntity.ok(collectionService.runCollection(id, request, username));
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<CollectionExportDto> exportCollection(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        CollectionExportDto exportDto = collectionService.exportCollection(id, username);
        String filename = "sitelook-collection-" + exportDto.getName().replaceAll("[^a-zA-Z0-9.-]", "_") + ".json";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(exportDto);
    }

    @PostMapping("/import")
    public ResponseEntity<SeoCollectionDto> importCollection(
            @RequestBody CollectionExportDto exportDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        Long userId = getUserId(username);
        return ResponseEntity.ok(collectionService.importCollection(exportDto, username, userId));
    }

    @PostMapping("/starter-template/{templateKey}")
    public ResponseEntity<SeoCollectionDto> createStarterTemplate(
            @PathVariable String templateKey,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = getUsername(userDetails);
        Long userId = getUserId(username);
        return ResponseEntity.ok(collectionService.createStarterTemplate(templateKey, username, userId));
    }

    private String getUsername(UserDetails userDetails) {
        if (userDetails == null) {
            return "guest";
        }
        return userDetails.getUsername();
    }

    private Long getUserId(String username) {
        if (username == null || "guest".equals(username)) return null;
        return userRepository.findByUsername(username).map(UserEntity::getId).orElse(null);
    }
}

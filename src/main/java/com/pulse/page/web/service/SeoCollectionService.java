package com.pulse.page.web.service;

import com.pulse.page.web.document.SeoCollectionDocument;
import com.pulse.page.web.document.SeoCollectionDocument.CollectionAuditSummary;
import com.pulse.page.web.document.SeoCollectionDocument.SeoCollectionItem;
import com.pulse.page.web.dto.*;
import com.pulse.page.web.enums.HealthGrade;
import com.pulse.page.web.exception.ReportNotFoundException;
import com.pulse.page.web.repository.mongo.SeoCollectionMongoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeoCollectionService {

    private static final String GUEST_USER = "guest";
    private static final String DEFAULT_METHOD = "AUDIT";
    private static final String DEFAULT_COLOR = "#4FD8C4";
    private static final String STATUS_PASSED = "PASSED";
    private static final String STATUS_WARNING = "WARNING";
    private static final String STATUS_FAILED = "FAILED";

    private final SeoCollectionMongoRepository collectionRepository;
    private final AuditReportProcessorService processorService;

    // Resilient in-memory storage fallback when MongoDB is unavailable/local
    private final Map<String, SeoCollectionDocument> inMemoryFallbackStore = new ConcurrentHashMap<>();

    private SeoCollectionDocument saveDocument(SeoCollectionDocument doc) {
        if (doc == null) return null;
        try {
            return collectionRepository.save(doc);
        } catch (Exception e) {
            log.warn("MongoDB storage unavailable ({}), using resilient in-memory fallback for collection '{}' (ID: {})",
                    e.getMessage(), doc.getName(), doc.getId());
            inMemoryFallbackStore.put(doc.getId(), doc);
            return doc;
        }
    }

    private SeoCollectionDocument findDocument(String id, String username) {
        if (id == null) {
            throw new ReportNotFoundException("Collection ID is null");
        }
        try {
            Optional<SeoCollectionDocument> opt = collectionRepository.findByIdAndUsername(id, username);
            if (opt.isPresent()) {
                return opt.get();
            }
        } catch (Exception e) {
            log.warn("MongoDB query failed for collection ID {}: {}", id, e.getMessage());
        }

        SeoCollectionDocument memDoc = inMemoryFallbackStore.get(id);
        if (memDoc != null && (username == null || GUEST_USER.equalsIgnoreCase(username) || username.equalsIgnoreCase(memDoc.getUsername()))) {
            return memDoc;
        }

        throw new ReportNotFoundException("Collection not found or access denied: " + id);
    }

    private void deleteDocument(SeoCollectionDocument doc) {
        if (doc == null) return;
        try {
            collectionRepository.delete(doc);
        } catch (Exception e) {
            log.warn("MongoDB deletion failed for collection ID {}: {}", doc.getId(), e.getMessage());
        }
        inMemoryFallbackStore.remove(doc.getId());
    }

    public List<SeoCollectionDto> getUserCollections(String username) {
        if (username == null || username.isBlank()) {
            return Collections.emptyList();
        }

        Map<String, SeoCollectionDocument> merged = new LinkedHashMap<>();
        try {
            List<SeoCollectionDocument> docs = collectionRepository.findByUsernameOrderByUpdatedAtDesc(username);
            for (SeoCollectionDocument d : docs) {
                merged.put(d.getId(), d);
            }
        } catch (Exception e) {
            log.warn("MongoDB list query failed ({}), falling back to in-memory collections for user '{}'", e.getMessage(), username);
        }

        for (SeoCollectionDocument d : inMemoryFallbackStore.values()) {
            if (username.equalsIgnoreCase(d.getUsername()) || (GUEST_USER.equalsIgnoreCase(username) && GUEST_USER.equalsIgnoreCase(d.getUsername()))) {
                merged.put(d.getId(), d);
            }
        }

        return merged.values().stream()
                .sorted(Comparator.comparing(SeoCollectionDocument::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(SeoCollectionDto::fromDocument)
                .toList();
    }

    public SeoCollectionDto getCollectionById(String id, String username) {
        SeoCollectionDocument doc = findDocument(id, username);
        return SeoCollectionDto.fromDocument(doc);
    }

    public SeoCollectionDto createCollection(CreateSeoCollectionRequest request, String username, Long userId) {
        List<SeoCollectionItem> items = mapToCollectionItems(request.getItems());

        SeoCollectionDocument doc = SeoCollectionDocument.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .username(username != null ? username : GUEST_USER)
                .name(request.getName())
                .description(request.getDescription())
                .color(request.getColor() != null ? request.getColor() : DEFAULT_COLOR)
                .icon(request.getIcon() != null ? request.getIcon() : "Folder")
                .tags(request.getTags() != null ? new ArrayList<>(request.getTags()) : new ArrayList<>())
                .items(items)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        SeoCollectionDocument saved = saveDocument(doc);
        log.info("User {} created new SEO Collection '{}' with {} items", username, saved.getName(), items.size());
        return SeoCollectionDto.fromDocument(saved);
    }

    public SeoCollectionDto updateCollection(String id, UpdateSeoCollectionRequest request, String username) {
        SeoCollectionDocument doc = findDocument(id, username);

        doc.setName(request.getName());
        doc.setDescription(request.getDescription());
        if (request.getColor() != null) doc.setColor(request.getColor());
        if (request.getIcon() != null) doc.setIcon(request.getIcon());
        if (request.getTags() != null) doc.setTags(new ArrayList<>(request.getTags()));
        doc.setUpdatedAt(Instant.now());

        SeoCollectionDocument saved = saveDocument(doc);
        log.info("User {} updated SEO Collection '{}'", username, saved.getName());
        return SeoCollectionDto.fromDocument(saved);
    }

    public void deleteCollection(String id, String username) {
        SeoCollectionDocument doc = findDocument(id, username);
        deleteDocument(doc);
        log.info("User {} deleted SEO Collection '{}'", username, id);
    }

    public SeoCollectionDto duplicateCollection(String id, String username) {
        SeoCollectionDocument original = findDocument(id, username);

        List<SeoCollectionItem> duplicatedItems = new ArrayList<>();
        if (original.getItems() != null) {
            for (SeoCollectionItem item : original.getItems()) {
                duplicatedItems.add(SeoCollectionItem.builder()
                        .id(UUID.randomUUID().toString())
                        .name(item.getName())
                        .url(item.getUrl())
                        .method(item.getMethod())
                        .enableJsRendering(item.isEnableJsRendering())
                        .expectedMinScore(item.getExpectedMinScore())
                        .maxResponseTimeMs(item.getMaxResponseTimeMs())
                        .customHeaders(item.getCustomHeaders())
                        .tags(item.getTags() != null ? new ArrayList<>(item.getTags()) : new ArrayList<>())
                        .build());
            }
        }

        SeoCollectionDocument duplicate = SeoCollectionDocument.builder()
                .id(UUID.randomUUID().toString())
                .userId(original.getUserId())
                .username(username != null ? username : GUEST_USER)
                .name(original.getName() + " (Copy)")
                .description(original.getDescription())
                .color(original.getColor())
                .icon(original.getIcon())
                .tags(original.getTags() != null ? new ArrayList<>(original.getTags()) : new ArrayList<>())
                .items(duplicatedItems)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        SeoCollectionDocument saved = saveDocument(duplicate);
        log.info("User {} duplicated SEO Collection '{}' into '{}'", username, original.getName(), saved.getName());
        return SeoCollectionDto.fromDocument(saved);
    }

    public SeoCollectionDto addItem(String collectionId, CreateSeoCollectionItemRequest request, String username) {
        SeoCollectionDocument doc = findDocument(collectionId, username);

        if (doc.getItems() == null) {
            doc.setItems(new ArrayList<>());
        }

        SeoCollectionItem newItem = SeoCollectionItem.builder()
                .id(UUID.randomUUID().toString())
                .name(request.getName())
                .url(request.getUrl())
                .method(request.getMethod() != null ? request.getMethod() : DEFAULT_METHOD)
                .enableJsRendering(Boolean.TRUE.equals(request.getEnableJsRendering()))
                .expectedMinScore(request.getExpectedMinScore() != null ? request.getExpectedMinScore() : 80)
                .maxResponseTimeMs(request.getMaxResponseTimeMs() != null ? request.getMaxResponseTimeMs() : 3000)
                .customHeaders(request.getCustomHeaders())
                .tags(request.getTags() != null ? new ArrayList<>(request.getTags()) : new ArrayList<>())
                .build();

        doc.getItems().add(newItem);
        doc.setUpdatedAt(Instant.now());

        SeoCollectionDocument saved = saveDocument(doc);
        return SeoCollectionDto.fromDocument(saved);
    }

    public SeoCollectionDto updateItem(String collectionId, String itemId, UpdateSeoCollectionItemRequest request, String username) {
        SeoCollectionDocument doc = findDocument(collectionId, username);

        if (doc.getItems() == null) {
            throw new ReportNotFoundException("Item not found in collection: " + itemId);
        }

        SeoCollectionItem item = doc.getItems().stream()
                .filter(i -> itemId.equals(i.getId()))
                .findFirst()
                .orElseThrow(() -> new ReportNotFoundException("Item not found in collection: " + itemId));

        item.setName(request.getName());
        item.setUrl(request.getUrl());
        if (request.getMethod() != null) item.setMethod(request.getMethod());
        if (request.getEnableJsRendering() != null) item.setEnableJsRendering(request.getEnableJsRendering());
        if (request.getExpectedMinScore() != null) item.setExpectedMinScore(request.getExpectedMinScore());
        if (request.getMaxResponseTimeMs() != null) item.setMaxResponseTimeMs(request.getMaxResponseTimeMs());
        if (request.getCustomHeaders() != null) item.setCustomHeaders(request.getCustomHeaders());
        if (request.getTags() != null) item.setTags(new ArrayList<>(request.getTags()));

        doc.setUpdatedAt(Instant.now());
        SeoCollectionDocument saved = saveDocument(doc);
        return SeoCollectionDto.fromDocument(saved);
    }

    public SeoCollectionDto deleteItem(String collectionId, String itemId, String username) {
        SeoCollectionDocument doc = findDocument(collectionId, username);

        if (doc.getItems() != null) {
            doc.getItems().removeIf(i -> itemId.equals(i.getId()));
        }

        doc.setUpdatedAt(Instant.now());
        SeoCollectionDocument saved = saveDocument(doc);
        return SeoCollectionDto.fromDocument(saved);
    }

    public SeoCollectionDto runSingleItem(String collectionId, String itemId, String username) {
        SeoCollectionDocument doc = findDocument(collectionId, username);

        if (doc.getItems() == null) {
            throw new ReportNotFoundException("Item not found in collection: " + itemId);
        }

        SeoCollectionItem item = doc.getItems().stream()
                .filter(i -> itemId.equals(i.getId()))
                .findFirst()
                .orElseThrow(() -> new ReportNotFoundException("Item not found in collection: " + itemId));

        try {
            AuditResponse audit = processorService.processAudit(item.getUrl(), item.isEnableJsRendering());
            int overallScore = audit.getScores() != null ? audit.getScores().getOverallScore() : 0;
            HealthGrade healthGrade = audit.getScores() != null ? audit.getScores().getHealthGrade() : HealthGrade.POOR;

            String status = computeAuditStatus(overallScore, item.getExpectedMinScore());

            int issuesCount = 0;
            if (audit.getAccessibilityMetrics() != null) issuesCount += audit.getAccessibilityMetrics().getImagesMissingAltCount();
            if (audit.getLinkMetrics() != null) issuesCount += audit.getLinkMetrics().getBrokenLinksCount();

            CollectionAuditSummary summary = CollectionAuditSummary.builder()
                    .auditId(audit.getId())
                    .overallScore(overallScore)
                    .healthGrade(healthGrade)
                    .httpStatus(audit.getHttpStatus())
                    .responseTimeMs(audit.getResponseTimeMs())
                    .seoScore(audit.getScores() != null ? audit.getScores().getSeoScore() : 0)
                    .performanceScore(audit.getScores() != null ? audit.getScores().getPerformanceScore() : 0)
                    .accessibilityScore(audit.getScores() != null ? audit.getScores().getAccessibilityScore() : 0)
                    .contentScore(audit.getScores() != null ? audit.getScores().getContentScore() : 0)
                    .issuesCount(issuesCount)
                    .pageTitle(audit.getSeoMetrics() != null ? audit.getSeoMetrics().getPageTitle() : null)
                    .auditedAt(Instant.now())
                    .status(status)
                    .build();

            item.setLastAudit(summary);
            recalculateAverageScore(doc);
            doc.setUpdatedAt(Instant.now());

            SeoCollectionDocument saved = saveDocument(doc);
            log.info("Ran single audit for collection item '{}' (URL: {}) - Score: {}", item.getName(), item.getUrl(), overallScore);
            return SeoCollectionDto.fromDocument(saved);
        } catch (Exception e) {
            log.error("Failed to run single audit for collection item '{}' (URL: {}): {}", item.getName(), item.getUrl(), e.getMessage(), e);
            CollectionAuditSummary summary = CollectionAuditSummary.builder()
                    .overallScore(0)
                    .healthGrade(HealthGrade.POOR)
                    .status(STATUS_FAILED)
                    .errorMessage(e.getMessage())
                    .auditedAt(Instant.now())
                    .build();
            item.setLastAudit(summary);
            doc.setUpdatedAt(Instant.now());
            SeoCollectionDocument saved = saveDocument(doc);
            return SeoCollectionDto.fromDocument(saved);
        }
    }

    public CollectionRunResultDto runCollection(String collectionId, CollectionRunRequest runRequest, String username) {
        SeoCollectionDocument doc = findDocument(collectionId, username);

        if (doc.getItems() == null || doc.getItems().isEmpty()) {
            throw new IllegalArgumentException("Collection has no items to run");
        }

        List<SeoCollectionItem> targets = doc.getItems();
        if (runRequest != null && runRequest.getItemIds() != null && !runRequest.getItemIds().isEmpty()) {
            Set<String> idSet = new HashSet<>(runRequest.getItemIds());
            targets = targets.stream().filter(it -> idSet.contains(it.getId())).toList();
        }

        long startTime = System.currentTimeMillis();
        boolean concurrent = runRequest == null || runRequest.isConcurrent();

        List<CollectionRunResultDto.ItemRunResult> itemResults = concurrent
                ? runConcurrently(targets)
                : runSequentially(targets);

        int passed = 0;
        int warnings = 0;
        int failed = 0;
        double scoreSum = 0;
        int scoredCount = 0;

        for (CollectionRunResultDto.ItemRunResult res : itemResults) {
            if (STATUS_PASSED.equalsIgnoreCase(res.getStatus())) {
                passed++;
            } else if (STATUS_WARNING.equalsIgnoreCase(res.getStatus())) {
                warnings++;
            } else {
                failed++;
            }
            if (res.getOverallScore() != null) {
                scoreSum += res.getOverallScore();
                scoredCount++;
            }
        }

        long durationMs = System.currentTimeMillis() - startTime;
        Double avgScore = scoredCount > 0 ? Math.round((scoreSum / scoredCount) * 10.0) / 10.0 : null;

        doc.setLastRunAt(Instant.now());
        doc.setAverageScore(avgScore);
        doc.setUpdatedAt(Instant.now());
        saveDocument(doc);

        log.info("Completed collection run for '{}' ({} URLs, Passed: {}, Failed: {}) in {}ms",
                doc.getName(), targets.size(), passed, failed, durationMs);

        return CollectionRunResultDto.builder()
                .collectionId(doc.getId())
                .collectionName(doc.getName())
                .totalUrls(targets.size())
                .completedUrls(itemResults.size())
                .passedUrls(passed)
                .warningUrls(warnings)
                .failedUrls(failed)
                .averageScore(avgScore)
                .durationMs(durationMs)
                .ranAt(Instant.now())
                .items(itemResults)
                .build();
    }

    private List<CollectionRunResultDto.ItemRunResult> runConcurrently(List<SeoCollectionItem> targets) {
        List<CollectionRunResultDto.ItemRunResult> results = new ArrayList<>();
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<CompletableFuture<CollectionRunResultDto.ItemRunResult>> futures = targets.stream()
                    .map(item -> CompletableFuture.supplyAsync(() -> executeItemAudit(item), executor))
                    .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

            for (CompletableFuture<CollectionRunResultDto.ItemRunResult> future : futures) {
                try {
                    results.add(future.get());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.error("Item audit execution was interrupted: {}", e.getMessage());
                } catch (Exception e) {
                    log.error("Error retrieving item audit result: {}", e.getMessage());
                }
            }
        }
        return results;
    }

    private List<CollectionRunResultDto.ItemRunResult> runSequentially(List<SeoCollectionItem> targets) {
        List<CollectionRunResultDto.ItemRunResult> results = new ArrayList<>();
        for (SeoCollectionItem item : targets) {
            results.add(executeItemAudit(item));
        }
        return results;
    }

    private String computeAuditStatus(int score, int expectedMinScore) {
        if (score >= expectedMinScore) {
            return STATUS_PASSED;
        } else if (score >= 50) {
            return STATUS_WARNING;
        } else {
            return STATUS_FAILED;
        }
    }

    private List<SeoCollectionItem> mapToCollectionItems(List<CreateSeoCollectionItemRequest> itemRequests) {
        if (itemRequests == null) {
            return new ArrayList<>();
        }
        List<SeoCollectionItem> items = new ArrayList<>();
        for (CreateSeoCollectionItemRequest itemReq : itemRequests) {
            items.add(SeoCollectionItem.builder()
                    .id(UUID.randomUUID().toString())
                    .name(itemReq.getName())
                    .url(itemReq.getUrl())
                    .method(itemReq.getMethod() != null ? itemReq.getMethod() : DEFAULT_METHOD)
                    .enableJsRendering(Boolean.TRUE.equals(itemReq.getEnableJsRendering()))
                    .expectedMinScore(itemReq.getExpectedMinScore() != null ? itemReq.getExpectedMinScore() : 80)
                    .maxResponseTimeMs(itemReq.getMaxResponseTimeMs() != null ? itemReq.getMaxResponseTimeMs() : 3000)
                    .customHeaders(itemReq.getCustomHeaders())
                    .tags(itemReq.getTags() != null ? new ArrayList<>(itemReq.getTags()) : new ArrayList<>())
                    .build());
        }
        return items;
    }

    private List<SeoCollectionItem> mapImportItems(List<CollectionExportDto.ExportItem> exportItems) {
        if (exportItems == null) {
            return new ArrayList<>();
        }
        List<SeoCollectionItem> items = new ArrayList<>();
        for (CollectionExportDto.ExportItem item : exportItems) {
            items.add(SeoCollectionItem.builder()
                    .id(UUID.randomUUID().toString())
                    .name(item.getName() != null ? item.getName() : item.getUrl())
                    .url(item.getUrl())
                    .method(item.getMethod() != null ? item.getMethod() : DEFAULT_METHOD)
                    .enableJsRendering(item.isEnableJsRendering())
                    .expectedMinScore(item.getExpectedMinScore() > 0 ? item.getExpectedMinScore() : 80)
                    .maxResponseTimeMs(item.getMaxResponseTimeMs() > 0 ? item.getMaxResponseTimeMs() : 3000)
                    .customHeaders(item.getCustomHeaders())
                    .tags(item.getTags() != null ? new ArrayList<>(item.getTags()) : new ArrayList<>())
                    .build());
        }
        return items;
    }

    private CollectionRunResultDto.ItemRunResult executeItemAudit(SeoCollectionItem item) {
        Integer prevScore = item.getLastAudit() != null ? item.getLastAudit().getOverallScore() : null;

        try {
            AuditResponse audit = processorService.processAudit(item.getUrl(), item.isEnableJsRendering());
            int overallScore = audit.getScores() != null ? audit.getScores().getOverallScore() : 0;
            HealthGrade healthGrade = audit.getScores() != null ? audit.getScores().getHealthGrade() : HealthGrade.POOR;

            String status = computeAuditStatus(overallScore, item.getExpectedMinScore());
            Integer delta = prevScore != null ? overallScore - prevScore : null;

            int issuesCount = 0;
            if (audit.getAccessibilityMetrics() != null) issuesCount += audit.getAccessibilityMetrics().getImagesMissingAltCount();
            if (audit.getLinkMetrics() != null) issuesCount += audit.getLinkMetrics().getBrokenLinksCount();

            CollectionAuditSummary summary = CollectionAuditSummary.builder()
                    .auditId(audit.getId())
                    .overallScore(overallScore)
                    .healthGrade(healthGrade)
                    .httpStatus(audit.getHttpStatus())
                    .responseTimeMs(audit.getResponseTimeMs())
                    .seoScore(audit.getScores() != null ? audit.getScores().getSeoScore() : 0)
                    .performanceScore(audit.getScores() != null ? audit.getScores().getPerformanceScore() : 0)
                    .accessibilityScore(audit.getScores() != null ? audit.getScores().getAccessibilityScore() : 0)
                    .contentScore(audit.getScores() != null ? audit.getScores().getContentScore() : 0)
                    .issuesCount(issuesCount)
                    .pageTitle(audit.getSeoMetrics() != null ? audit.getSeoMetrics().getPageTitle() : null)
                    .auditedAt(Instant.now())
                    .status(status)
                    .build();

            item.setLastAudit(summary);

            return CollectionRunResultDto.ItemRunResult.builder()
                    .itemId(item.getId())
                    .name(item.getName())
                    .url(item.getUrl())
                    .status(status)
                    .overallScore(overallScore)
                    .healthGrade(healthGrade != null ? healthGrade.name() : null)
                    .httpStatus(audit.getHttpStatus())
                    .responseTimeMs(audit.getResponseTimeMs())
                    .expectedMinScore(item.getExpectedMinScore())
                    .previousScore(prevScore)
                    .scoreDelta(delta)
                    .issuesCount(issuesCount)
                    .pageTitle(audit.getSeoMetrics() != null ? audit.getSeoMetrics().getPageTitle() : null)
                    .auditId(audit.getId())
                    .build();

        } catch (Exception e) {
            log.error("Suite execution failed for item '{}' (URL: {}): {}", item.getName(), item.getUrl(), e.getMessage());

            CollectionAuditSummary summary = CollectionAuditSummary.builder()
                    .overallScore(0)
                    .healthGrade(HealthGrade.POOR)
                    .status(STATUS_FAILED)
                    .errorMessage(e.getMessage())
                    .auditedAt(Instant.now())
                    .build();
            item.setLastAudit(summary);

            return CollectionRunResultDto.ItemRunResult.builder()
                    .itemId(item.getId())
                    .name(item.getName())
                    .url(item.getUrl())
                    .status(STATUS_FAILED)
                    .overallScore(0)
                    .healthGrade(HealthGrade.POOR.name())
                    .expectedMinScore(item.getExpectedMinScore())
                    .previousScore(prevScore)
                    .errorMessage(e.getMessage())
                    .build();
        }
    }

    public CollectionExportDto exportCollection(String id, String username) {
        SeoCollectionDocument doc = findDocument(id, username);

        List<CollectionExportDto.ExportItem> items = new ArrayList<>();
        if (doc.getItems() != null) {
            for (SeoCollectionItem item : doc.getItems()) {
                items.add(CollectionExportDto.ExportItem.builder()
                        .name(item.getName())
                        .url(item.getUrl())
                        .method(item.getMethod())
                        .enableJsRendering(item.isEnableJsRendering())
                        .expectedMinScore(item.getExpectedMinScore())
                        .maxResponseTimeMs(item.getMaxResponseTimeMs())
                        .customHeaders(item.getCustomHeaders())
                        .tags(item.getTags() != null ? new ArrayList<>(item.getTags()) : new ArrayList<>())
                        .build());
            }
        }

        return CollectionExportDto.builder()
                .schema("https://sitelook.dev/schemas/collection/v1.json")
                .exporter("SiteLook-v1.0")
                .name(doc.getName())
                .description(doc.getDescription())
                .color(doc.getColor())
                .icon(doc.getIcon())
                .tags(doc.getTags() != null ? new ArrayList<>(doc.getTags()) : new ArrayList<>())
                .exportedAt(Instant.now())
                .items(items)
                .build();
    }

    public SeoCollectionDto importCollection(CollectionExportDto exportDto, String username, Long userId) {
        if (exportDto == null || exportDto.getName() == null || exportDto.getName().isBlank()) {
            throw new IllegalArgumentException("Invalid collection import payload: Name is required.");
        }

        List<SeoCollectionItem> items = mapImportItems(exportDto.getItems());

        SeoCollectionDocument doc = SeoCollectionDocument.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .username(username != null ? username : GUEST_USER)
                .name(exportDto.getName())
                .description(exportDto.getDescription())
                .color(exportDto.getColor() != null ? exportDto.getColor() : DEFAULT_COLOR)
                .icon(exportDto.getIcon() != null ? exportDto.getIcon() : "Folder")
                .tags(exportDto.getTags() != null ? new ArrayList<>(exportDto.getTags()) : new ArrayList<>())
                .items(items)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        SeoCollectionDocument saved = saveDocument(doc);
        log.info("User {} imported SEO Collection '{}' with {} items", username, saved.getName(), items.size());
        return SeoCollectionDto.fromDocument(saved);
    }

    public SeoCollectionDto createStarterTemplate(String templateKey, String username, Long userId) {
        CollectionExportDto template = getTemplateDefinition(templateKey);
        return importCollection(template, username, userId);
    }

    private CollectionExportDto getTemplateDefinition(String templateKey) {
        String key = templateKey != null ? templateKey.toLowerCase().trim() : "saas";
        return switch (key) {
            case "ecommerce" -> CollectionExportDto.builder()
                    .name("E-Commerce Funnel Suite")
                    .description("Critical conversion pages: Storefront, Product Matrix, Cart, and Checkout.")
                    .color("#4ADE80")
                    .icon("ShoppingCart")
                    .tags(new ArrayList<>(List.of("ecommerce", "conversion", "critical")))
                    .items(new ArrayList<>(List.of(
                            CollectionExportDto.ExportItem.builder().name("Store Homepage").url("https://shopify.com").method(DEFAULT_METHOD).expectedMinScore(85).maxResponseTimeMs(3000).build(),
                            CollectionExportDto.ExportItem.builder().name("Product Detail Page").url("https://amazon.com").method(DEFAULT_METHOD).expectedMinScore(80).maxResponseTimeMs(3500).build(),
                            CollectionExportDto.ExportItem.builder().name("Documentation Hub").url("https://developer.mozilla.org").method(DEFAULT_METHOD).expectedMinScore(90).maxResponseTimeMs(2500).build()
                    )))
                    .build();
            case "devhub" -> CollectionExportDto.builder()
                    .name("Developer Documentation Suite")
                    .description("API references, technical guides, changelogs, and sandbox playgrounds.")
                    .color("#7AA2F7")
                    .icon("Code")
                    .tags(new ArrayList<>(List.of("docs", "api", "developer")))
                    .items(new ArrayList<>(List.of(
                            CollectionExportDto.ExportItem.builder().name("API Reference Root").url("https://docs.github.com").method(DEFAULT_METHOD).expectedMinScore(85).maxResponseTimeMs(2500).build(),
                            CollectionExportDto.ExportItem.builder().name("Codeforces Arena").url("https://codeforces.com").method(DEFAULT_METHOD).expectedMinScore(80).maxResponseTimeMs(3500).build(),
                            CollectionExportDto.ExportItem.builder().name("LeetCode Portal").url("https://leetcode.com").method(DEFAULT_METHOD).expectedMinScore(80).maxResponseTimeMs(3000).build()
                    )))
                    .build();
            default -> CollectionExportDto.builder()
                    .name("SaaS Core Product Suite")
                    .description("High-intent landing pages, pricing tier table, feature pages, and login gates.")
                    .color(DEFAULT_COLOR)
                    .icon("Lightning")
                    .tags(new ArrayList<>(List.of("saas", "production", "marketing")))
                    .items(new ArrayList<>(List.of(
                            CollectionExportDto.ExportItem.builder().name("Product Landing").url("https://vercel.com").method(DEFAULT_METHOD).expectedMinScore(90).maxResponseTimeMs(2500).build(),
                            CollectionExportDto.ExportItem.builder().name("Pricing Tier Matrix").url("https://stripe.com").method(DEFAULT_METHOD).expectedMinScore(85).maxResponseTimeMs(3000).build(),
                            CollectionExportDto.ExportItem.builder().name("Knowledge Base").url("https://wikipedia.org").method(DEFAULT_METHOD).expectedMinScore(88).maxResponseTimeMs(2000).build()
                    )))
                    .build();
        };
    }

    private void recalculateAverageScore(SeoCollectionDocument doc) {
        if (doc.getItems() == null || doc.getItems().isEmpty()) {
            doc.setAverageScore(null);
            return;
        }
        double sum = 0;
        int count = 0;
        for (SeoCollectionItem item : doc.getItems()) {
            if (item.getLastAudit() != null && item.getLastAudit().getOverallScore() != null) {
                sum += item.getLastAudit().getOverallScore();
                count++;
            }
        }
        if (count > 0) {
            doc.setAverageScore(Math.round((sum / count) * 10.0) / 10.0);
        } else {
            doc.setAverageScore(null);
        }
    }
}

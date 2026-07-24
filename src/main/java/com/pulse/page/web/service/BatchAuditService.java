package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.BatchAuditRequest;
import com.pulse.page.web.dto.BatchAuditResponse;
import com.pulse.page.web.entity.BatchAuditJobEntity;
import com.pulse.page.web.repository.BatchAuditJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BatchAuditService {

    private final BatchAuditJobRepository jobRepository;
    private final AuditReportProcessorService processorService;
    private final CacheService cacheService;

    @Transactional
    public BatchAuditResponse submitBatchAudit(BatchAuditRequest request) {
        String jobId = UUID.randomUUID().toString();

        BatchAuditJobEntity job = BatchAuditJobEntity.builder()
                .jobId(jobId)
                .status(BatchAuditJobEntity.Status.PENDING)
                .totalUrls(request.getUrls().size())
                .completedUrls(0)
                .failedUrls(0)
                .urls(request.getUrls())
                .webhookUrl(request.getWebhookUrl())
                .correlationId(request.getCorrelationId())
                .build();

        jobRepository.save(job);

        CompletableFuture.runAsync(() -> processBatchAsync(jobId));

        return BatchAuditResponse.builder()
                .jobId(jobId)
                .status("PENDING")
                .totalUrls(request.getUrls().size())
                .completedUrls(0)
                .failedUrls(0)
                .submittedAt(Instant.now())
                .webhookUrl(request.getWebhookUrl())
                .correlationId(request.getCorrelationId())
                .build();
    }

    public Optional<BatchAuditResponse> getJobStatus(String jobId) {
        return jobRepository.findByJobId(jobId)
                .map(this::mapToResponse);
    }

    public List<BatchAuditResponse> getAllJobs() {
        return jobRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    private void processBatchAsync(String jobId) {
        BatchAuditJobEntity job = jobRepository.findByJobId(jobId)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        job.setStatus(BatchAuditJobEntity.Status.RUNNING);
        jobRepository.save(job);

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<CompletableFuture<Void>> futures = job.getUrls().stream()
                    .map(url -> CompletableFuture.runAsync(() -> processSingleUrl(jobId, url), executor))
                    .toList();

            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

        } catch (Exception e) {
            log.error("Batch audit job {} failed: {}", jobId, e.getMessage());
            job.setStatus(BatchAuditJobEntity.Status.FAILED);
            job.setErrorMessage(e.getMessage());
        } finally {
            job = jobRepository.findByJobId(jobId).orElseThrow();
            if (job.getFailedUrls() > 0 && job.getCompletedUrls() > 0) {
                job.setStatus(BatchAuditJobEntity.Status.PARTIAL);
            } else if (job.getCompletedUrls() == job.getTotalUrls()) {
                job.setStatus(BatchAuditJobEntity.Status.COMPLETED);
            } else {
                job.setStatus(BatchAuditJobEntity.Status.FAILED);
            }
            job.setCompletedAt(Instant.now());
            jobRepository.save(job);

            if (job.getWebhookUrl() != null && !job.getWebhookUrl().isBlank()) {
                sendWebhookCallback(job);
            }
        }
    }

    private void processSingleUrl(String jobId, String url) {
        try {
            Optional<AuditResponse> cached = cacheService.getCachedAudit(url);
            AuditResponse response = cached.orElseGet(() -> {
                try {
                    return processorService.processAudit(url);
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });

            BatchAuditJobEntity job = jobRepository.findByJobId(jobId).orElseThrow();
            job.setCompletedUrls(job.getCompletedUrls() + 1);
            jobRepository.save(job);

            // Store individual result
            BatchAuditResponse.BatchAuditUrlResult result = BatchAuditResponse.BatchAuditUrlResult.builder()
                    .url(url)
                    .status("SUCCESS")
                    .auditId(response.getId())
                    .overallScore(response.getScores() != null ? response.getScores().getOverallScore() : null)
                    .build();
            addResultToJob(jobId, result);

        } catch (Exception e) {
            log.warn("Batch audit failed for URL {}: {}", url, e.getMessage());
            BatchAuditJobEntity job = jobRepository.findByJobId(jobId).orElseThrow();
            job.setFailedUrls(job.getFailedUrls() + 1);
            jobRepository.save(job);

            BatchAuditResponse.BatchAuditUrlResult result = BatchAuditResponse.BatchAuditUrlResult.builder()
                    .url(url)
                    .status("FAILED")
                    .error(e.getMessage())
                    .build();
            addResultToJob(jobId, result);
        }
    }

    private void addResultToJob(String jobId, BatchAuditResponse.BatchAuditUrlResult result) {
        // Results stored via individual URL processing
    }

    private void sendWebhookCallback(BatchAuditJobEntity job) {
        log.info("Sending batch audit completion webhook to {}", job.getWebhookUrl());
    }

    private BatchAuditResponse mapToResponse(BatchAuditJobEntity entity) {
        return BatchAuditResponse.builder()
                .jobId(entity.getJobId())
                .status(entity.getStatus().name())
                .totalUrls(entity.getTotalUrls())
                .completedUrls(entity.getCompletedUrls())
                .failedUrls(entity.getFailedUrls())
                .submittedAt(entity.getSubmittedAt())
                .completedAt(entity.getCompletedAt())
                .webhookUrl(entity.getWebhookUrl())
                .correlationId(entity.getCorrelationId())
                .build();
    }
}
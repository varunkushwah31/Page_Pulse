package com.pulse.page.web.service;

import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.dto.BatchAuditRequest;
import com.pulse.page.web.dto.BatchAuditResponse;
import com.pulse.page.web.entity.BatchAuditJobEntity;
import com.pulse.page.web.entity.BatchAuditResultEntity;
import com.pulse.page.web.repository.jpa.BatchAuditJobRepository;
import com.pulse.page.web.repository.jpa.BatchAuditResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final BatchAuditResultRepository resultRepository;
    private final AuditReportProcessorService processorService;
    private final CacheService cacheService;
    private final WebhookNotificationService webhookService;

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
                .enableJsRendering(request.isEnableJsRendering())
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

        boolean enableJs = job.isEnableJsRendering();

        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<CompletableFuture<Void>> futures = job.getUrls().stream()
                    .map(url -> CompletableFuture.runAsync(() -> processSingleUrl(jobId, url, enableJs), executor))
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

    private void processSingleUrl(String jobId, String url, boolean enableJsRendering) {
        try {
            AuditResponse response;
            if (!enableJsRendering) {
                Optional<AuditResponse> cached = cacheService.getCachedAudit(url);
                response = cached.isPresent() ? cached.get() : processorService.processAudit(url, false);
            } else {
                response = processorService.processAudit(url, true);
            }

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
        BatchAuditResultEntity resultEntity = BatchAuditResultEntity.builder()
                .jobId(jobId)
                .url(result.getUrl())
                .status(result.getStatus())
                .auditId(result.getAuditId() != null ? result.getAuditId().toString() : null)
                .overallScore(result.getOverallScore())
                .errorMessage(result.getError())
                .build();
        resultRepository.save(resultEntity);
        log.debug("Batch URL result stored for job {}: {} ({})", jobId, result.getUrl(), result.getStatus());
    }

    private void sendWebhookCallback(BatchAuditJobEntity job) {
        if (job.getWebhookUrl() == null || job.getWebhookUrl().isBlank()) {
            log.debug("No webhook URL configured for batch job {}", job.getJobId());
            return;
        }

        try {
            webhookService.sendBatchAuditCompletion(
                    job.getWebhookUrl(),
                    job.getJobId(),
                    job.getTotalUrls(),
                    job.getCompletedUrls(),
                    job.getFailedUrls(),
                    job.getCorrelationId()
            );
            log.info("Batch audit completion webhook sent to {}", job.getWebhookUrl());
        } catch (Exception e) {
            log.error("Failed to send webhook callback for batch job {}: {}", job.getJobId(), e.getMessage(), e);
        }
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
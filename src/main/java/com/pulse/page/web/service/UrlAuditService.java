package com.pulse.page.web.service;

import com.pulse.page.web.config.MetricsConfig;
import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.repository.jpa.AuditReportJpaRepository;
import com.pulse.page.web.repository.mongo.AuditReportMongoRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.URL;
import java.util.Optional;

@Slf4j
@Service
public class UrlAuditService {

    private static final int TIMEOUT_MS = 5000;
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SiteLook/2.0 Enterprise Engine";
    private static final String CONTENT_ATTR = "content";
    private static final String METRIC_AUDIT_NAME = "audit";

    private final AuditReportJpaRepository jpaRepository;
    private final AuditReportMongoRepository mongoRepository;
    private final MetricsConfig metricsConfig;
    private final CacheService cacheService;

    @org.springframework.beans.factory.annotation.Autowired
    public UrlAuditService(
            AuditReportJpaRepository jpaRepository,
            AuditReportMongoRepository mongoRepository,
            MetricsConfig metricsConfig,
            CacheService cacheService) {
        this.jpaRepository = jpaRepository;
        this.mongoRepository = mongoRepository;
        this.metricsConfig = metricsConfig;
        this.cacheService = cacheService;
    }

    public UrlAuditService(
            AuditReportJpaRepository jpaRepository,
            AuditReportMongoRepository mongoRepository,
            MetricsConfig metricsConfig) {
        this(jpaRepository, mongoRepository, metricsConfig, null);
    }

    @Transactional(rollbackFor = Exception.class)
    @CircuitBreaker(name = "scraperEngine", fallbackMethod = "auditFallback")
    @Retry(name = "scraperEngine")
    public AuditReportEntity auditAndSaveTransient(String rawUrl) throws IOException {
        String validatedUrl = validateUrl(rawUrl);
        String domain = extractDomain(validatedUrl);

        if (cacheService != null) {
            Optional<AuditResponse> cached = cacheService.getCachedAudit(validatedUrl);
            if (cached.isPresent() && cached.get().getId() != null) {
                Optional<AuditReportEntity> existing = jpaRepository.findById(cached.get().getId());
                if (existing.isPresent()) {
                    log.info("Serving transient audit report from cache for URL: {}", validatedUrl);
                    return existing.get();
                }
            }
        }

        Timer.Sample sample = metricsConfig.startAuditTimer();
        long startTime = System.currentTimeMillis();
        Connection connection = Jsoup.connect(validatedUrl)
                .timeout(TIMEOUT_MS)
                .userAgent(USER_AGENT)
                .followRedirects(true)
                .ignoreHttpErrors(true);

        Connection.Response response = connection.execute();
        long responseTimeMs = System.currentTimeMillis() - startTime;

        String contentType = response.contentType();
        if (contentType == null || !contentType.toLowerCase().contains("text/html")) {
            metricsConfig.incrementAuditCounter(METRIC_AUDIT_NAME, "error_content_type");
            throw new IllegalArgumentException(
                    "Target URL content type '" + (contentType != null ? contentType : "unknown") +
                            "' is not text/html. Scraper execution aborted.");
        }

        Document doc = response.parse();

        String pageTitle = extractTitle(doc);
        String metaDescription = extractMetaDescription(doc);
        int h1Count = doc.select("h1").size();
        int imagesMissingAlt = doc.select("img:not([alt]), img[alt=]").size();
        int wordCount = calculateWordCount(doc);

        AuditReportEntity entity = AuditReportEntity.builder()
                .url(validatedUrl)
                .domain(domain)
                .httpStatus(response.statusCode())
                .responseTimeMs(responseTimeMs)
                .pageTitle(pageTitle)
                .metaDescription(metaDescription)
                .h1Count(h1Count)
                .imagesMissingAltCount(imagesMissingAlt)
                .wordCount(wordCount)
                .contentType(contentType)
                .build();

        metricsConfig.recordAuditDuration(sample, METRIC_AUDIT_NAME, "success");
        metricsConfig.incrementAuditCounter(METRIC_AUDIT_NAME, "success");
        metricsConfig.recordScrapedUrlSize(doc.html().length());
        metricsConfig.recordResponseTime(METRIC_AUDIT_NAME, responseTimeMs);

        return jpaRepository.save(entity);
    }

    @Transactional(readOnly = true)
    public AuditReportEntity findTransientById(Long tempId) {
        return jpaRepository.findById(tempId)
                .orElseThrow(() -> new com.pulse.page.web.exception.ReportNotFoundException(
                        "Temporary H2 audit report record with ID " + tempId + " not found."));
    }

    @Transactional(rollbackFor = Exception.class)
    public AuditReportDocument saveAuditReportToMongo(Long tempId) {
        AuditReportEntity transientEntity = jpaRepository.findById(tempId)
                .orElseThrow(() -> new com.pulse.page.web.exception.ReportNotFoundException(
                        "Temporary H2 audit report record with ID " + tempId + " not found."));

        AuditReportDocument document = AuditReportDocument.builder()
                .originalTempId(transientEntity.getId())
                .url(transientEntity.getUrl())
                .domain(transientEntity.getDomain())
                .httpStatus(transientEntity.getHttpStatus())
                .responseTimeMs(transientEntity.getResponseTimeMs())
                .pageTitle(transientEntity.getPageTitle())
                .metaDescription(transientEntity.getMetaDescription())
                .h1Count(transientEntity.getH1Count())
                .imagesMissingAltCount(transientEntity.getImagesMissingAltCount())
                .wordCount(transientEntity.getWordCount())
                .contentType(transientEntity.getContentType())
                .seoScore(transientEntity.getSeoScore())
                .contentScore(transientEntity.getContentScore())
                .accessibilityScore(transientEntity.getAccessibilityScore())
                .performanceScore(transientEntity.getPerformanceScore())
                .overallScore(transientEntity.getOverallScore())
                .healthGrade(transientEntity.getHealthGrade())
                .build();

        AuditReportDocument savedDocument = mongoRepository.save(document);
        jpaRepository.deleteById(tempId);

        return savedDocument;
    }

    public String validateUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new com.pulse.page.web.exception.InvalidUrlException("Target URL must not be blank.");
        }
        String trimmed = rawUrl.trim();
        if (trimmed.contains("://")) {
            int schemeEnd = trimmed.indexOf("://");
            String scheme = trimmed.substring(0, schemeEnd).toLowerCase();
            if (!scheme.equals("http") && !scheme.equals("https")) {
                throw new com.pulse.page.web.exception.InvalidUrlException(
                        "Invalid URL scheme '" + scheme + "'. Only HTTP and HTTPS are supported.");
            }
        } else {
            trimmed = "https://" + trimmed;
        }
        try {
            URL urlObj = URI.create(trimmed).toURL();
            URI uriObj = urlObj.toURI();
            if (uriObj.getHost() == null || uriObj.getHost().isBlank()) {
                throw new com.pulse.page.web.exception.InvalidUrlException("URL host is invalid for: " + rawUrl);
            }
            return trimmed;
        } catch (com.pulse.page.web.exception.InvalidUrlException e) {
            throw e;
        } catch (Exception e) {
            throw new com.pulse.page.web.exception.InvalidUrlException("Malformed URL structure: " + rawUrl, e);
        }
    }

    private String extractDomain(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            if (host != null) {
                return host.startsWith("www.") ? host.substring(4) : host;
            }
        } catch (Exception e) {
            log.trace("Domain extraction fallback to raw URL for input {}: {}", url, e.getMessage());
        }
        return url;
    }

    private String extractTitle(Document doc) {
        String title = doc.title();
        if (!title.isBlank()) {
            return title.trim();
        }
        Element titleEl = doc.selectFirst("title");
        return (titleEl != null && !titleEl.text().isBlank()) ? titleEl.text().trim() : null;
    }

    private String extractMetaDescription(Document doc) {
        Element meta = doc.selectFirst("meta[name=description], meta[name=Description], meta[property=og:description]");
        if (meta == null) {
            for (Element el : doc.select("meta")) {
                if ("description".equalsIgnoreCase(el.attr("name"))
                        || "og:description".equalsIgnoreCase(el.attr("property"))) {
                    meta = el;
                    break;
                }
            }
        }
        if (meta != null && meta.hasAttr(CONTENT_ATTR) && !meta.attr(CONTENT_ATTR).isBlank()) {
            return meta.attr(CONTENT_ATTR).trim();
        }
        return null;
    }

    private int calculateWordCount(Document doc) {
        Document cleanDoc = doc.clone();
        cleanDoc.select("script, style, noscript, svg").remove();
        Element bodyEl = cleanDoc.body();
        String text = bodyEl.text();
        if (text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }

    public AuditReportEntity auditFallback(String rawUrl, Exception ex) {
        log.error("Circuit breaker triggered for URL: {} - {}", rawUrl, ex.getMessage());
        throw new com.pulse.page.web.exception.CircuitBreakerOpenException("Scraper circuit breaker open - service unavailable for: " + rawUrl, ex);
    }
}

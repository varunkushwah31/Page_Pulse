package com.pulse.page.web.service;

import com.pulse.page.web.document.AuditReportDocument;
import com.pulse.page.web.entity.AuditReportEntity;
import com.pulse.page.web.repository.AuditReportJpaRepository;
import com.pulse.page.web.repository.AuditReportMongoRepository;
import lombok.RequiredArgsConstructor;
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
import java.util.NoSuchElementException;

@Slf4j
@Service
@RequiredArgsConstructor
public class UrlAuditService {

    private static final int TIMEOUT_MS = 5000;
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PagePulse/2.0 Enterprise Engine";
    private static final String CONTENT_ATTR = "content";

    private final AuditReportJpaRepository jpaRepository;
    private final AuditReportMongoRepository mongoRepository;

    @Transactional
    public AuditReportEntity auditAndSaveTransient(String rawUrl) throws IOException {
        String validatedUrl = validateUrl(rawUrl);
        String domain = extractDomain(validatedUrl);

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

        return jpaRepository.save(entity);
    }

    @Transactional
    public AuditReportDocument saveAuditReportToMongo(Long tempId) {
        AuditReportEntity transientEntity = jpaRepository.findById(tempId)
                .orElseThrow(() -> new NoSuchElementException(
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
            throw new IllegalArgumentException("Target URL must not be blank.");
        }
        String trimmed = rawUrl.trim();
        if (trimmed.contains("://")) {
            int schemeEnd = trimmed.indexOf("://");
            String scheme = trimmed.substring(0, schemeEnd).toLowerCase();
            if (!scheme.equals("http") && !scheme.equals("https")) {
                throw new IllegalArgumentException(
                        "Invalid URL scheme '" + scheme + "'. Only HTTP and HTTPS are supported.");
            }
        } else {
            trimmed = "https://" + trimmed;
        }
        try {
            URL urlObj = URI.create(trimmed).toURL();
            URI uriObj = urlObj.toURI();
            if (uriObj.getHost() == null || uriObj.getHost().isBlank()) {
                throw new IllegalArgumentException("URL host is invalid for: " + rawUrl);
            }
            return trimmed;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Malformed URL structure: " + rawUrl, e);
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
}

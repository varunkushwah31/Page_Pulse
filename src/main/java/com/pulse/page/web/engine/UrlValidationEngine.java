package com.pulse.page.web.engine;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URL;

@Slf4j
@Component
public class UrlValidationEngine {

    public String validateAndNormalize(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException("Target URL must not be empty or blank.");
        }

        String trimmed = rawUrl.trim();
        if (trimmed.contains("://")) {
            int schemeEnd = trimmed.indexOf("://");
            String scheme = trimmed.substring(0, schemeEnd).toLowerCase();
            if (!scheme.equals("http") && !scheme.equals("https")) {
                throw new IllegalArgumentException("Invalid URL scheme '" + scheme + "'. Only HTTP and HTTPS are supported.");
            }
        } else {
            trimmed = "https://" + trimmed;
        }

        try {
            URL urlObj = new URI(trimmed).toURL();
            URI uriObj = urlObj.toURI();
            String host = uriObj.getHost();

            if (host == null || host.isBlank()) {
                throw new IllegalArgumentException("Invalid URL host for target: " + rawUrl);
            }

            log.debug("URL validated successfully: {}", trimmed);
            return trimmed;
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Malformed URL structure: " + rawUrl, e);
        }
    }

    public String extractDomain(String url) {
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
}

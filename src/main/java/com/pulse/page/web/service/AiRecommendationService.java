package com.pulse.page.web.service;

import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.model.AccessibilityMetrics;
import com.pulse.page.web.model.ContentMetrics;
import com.pulse.page.web.model.SeoMetrics;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
public class AiRecommendationService {

    private static final String CATEGORY_SEO = "SEO";
    private static final String CATEGORY_ACCESSIBILITY = "ACCESSIBILITY";
    private static final String CATEGORY_PERFORMANCE = "PERFORMANCE";
    private static final String CATEGORY_CONTENT = "CONTENT";

    private static final String IMPACT_HIGH = "HIGH";
    private static final String IMPACT_MEDIUM = "MEDIUM";
    private static final String IMPACT_LOW = "LOW";

    public List<AiRecommendationDto> generateRecommendations(AuditResponse report) {
        if (report == null) {
            return Collections.emptyList();
        }

        List<AiRecommendationDto> recommendations = new ArrayList<>();
        SeoMetrics seo = report.getSeoMetrics();
        ContentMetrics content = report.getContentMetrics();
        AccessibilityMetrics a11y = report.getAccessibilityMetrics();
        String domain = report.getDomain() != null ? report.getDomain() : "example.com";

        buildSeoRecommendations(seo, domain, recommendations);
        buildAccessibilityRecommendations(a11y, domain, recommendations);
        buildContentRecommendations(content, recommendations);
        buildSchemaRecommendations(seo, domain, recommendations);

        log.info("Generated {} AI code fix recommendations for target domain: {}", recommendations.size(), domain);
        return recommendations;
    }

    private void buildSeoRecommendations(SeoMetrics seo, String domain, List<AiRecommendationDto> recs) {
        if (seo == null) return;

        if (!seo.isHasTitle() || seo.getPageTitle() == null || seo.getPageTitle().isBlank()) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_SEO)
                .issue("Missing HTML <title> element in document <head>.")
                .title("Add Descriptive Page Title Tag")
                .codeSnippet("<title>" + capitalizeDomain(domain) + " | Official Website</title>")
                .explanation("Title tags define the document title displayed on Search Engine Results Pages (SERPs) and browser tabs.")
                .impactLevel(IMPACT_HIGH)
                .build());
        } else if (seo.getTitleLength() > 60) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_SEO)
                .issue("Page title exceeds optimal 60 character SERP limit (" + seo.getTitleLength() + " chars).")
                .title("Optimize Page Title Length")
                .codeSnippet("<title>" + truncate(seo.getPageTitle(), 55) + "...</title>")
                .explanation("Search engines truncate titles longer than 60 characters. Truncate long titles to prevent clipping.")
                .impactLevel(IMPACT_MEDIUM)
                .build());
        }

        if (!seo.isHasMetaDescription() || seo.getMetaDescription() == null || seo.getMetaDescription().isBlank()) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_SEO)
                .issue("Missing meta description tag.")
                .title("Insert High-CTR Meta Description")
                .codeSnippet("<meta name=\"description\" content=\"Discover " + domain + " - explore features, performance insights, and analytics.\">")
                .explanation("Meta descriptions inform search engine users about page content. A compelling description increases organic CTR.")
                .impactLevel(IMPACT_HIGH)
                .build());
        }

        if (!seo.isHasViewportMeta()) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_PERFORMANCE)
                .issue("Missing mobile-responsive viewport meta tag.")
                .title("Add Responsive Viewport Meta Tag")
                .codeSnippet("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
                .explanation("Tells mobile browsers how to render page width and initial zoom scale, ensuring mobile-friendliness.")
                .impactLevel(IMPACT_HIGH)
                .build());
        }

        if (seo.getCanonicalUrl() == null || seo.getCanonicalUrl().isBlank()) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_SEO)
                .issue("Missing canonical link reference.")
                .title("Declare Self-Referencing Canonical Tag")
                .codeSnippet("<link rel=\"canonical\" href=\"https://" + domain + "/\">")
                .explanation("Canonical tags prevent duplicate content issues by indicating the master URL to search indexing engines.")
                .impactLevel(IMPACT_MEDIUM)
                .build());
        }
    }

    private void buildAccessibilityRecommendations(AccessibilityMetrics a11y, String domain, List<AiRecommendationDto> recs) {
        if (a11y == null) return;

        if (a11y.getImagesMissingAltCount() > 0) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_ACCESSIBILITY)
                .issue(a11y.getImagesMissingAltCount() + " image(s) missing alt descriptive attributes.")
                .title("Add Descriptive Alt Attributes to Images")
                .codeSnippet("<img src=\"hero-banner.jpg\" alt=\"" + capitalizeDomain(domain) + " platform banner graphic\" width=\"800\" height=\"400\">")
                .explanation("Screen readers and search crawlers rely on alt text to understand image context for visually impaired users.")
                .impactLevel(IMPACT_HIGH)
                .build());
        }

        if (!a11y.isHasHtmlLangAttribute()) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_ACCESSIBILITY)
                .issue("Missing lang attribute on root <html> element.")
                .title("Declare Root HTML Language Attribute")
                .codeSnippet("<html lang=\"en\">")
                .explanation("Specifying language enables text-to-speech screen readers to choose the appropriate pronunciation rules.")
                .impactLevel(IMPACT_MEDIUM)
                .build());
        }
    }

    private void buildContentRecommendations(ContentMetrics content, List<AiRecommendationDto> recs) {
        if (content == null || content.getHeadingCounts() == null) return;

        int h1Count = content.getHeadingCounts().getOrDefault("h1", 0);
        if (h1Count == 0) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_CONTENT)
                .issue("Document contains zero <h1> heading tags.")
                .title("Add Primary <h1> Document Heading")
                .codeSnippet("<h1>Primary Topic or Brand Headline</h1>")
                .explanation("An <h1> heading specifies the main topic of the page for users and search engine indexers.")
                .impactLevel(IMPACT_HIGH)
                .build());
        } else if (h1Count > 1) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_CONTENT)
                .issue("Page contains " + h1Count + " <h1> heading tags. Standard WCAG guidelines recommend 1 main <h1> per page.")
                .title("Consolidate Multiple <h1> Headings")
                .codeSnippet("""
                    <!-- Keep single primary <h1> and convert subheadings to <h2> -->
                    <h1>Main Topic Header</h1>
                    <h2>Secondary Section Header</h2>""")
                .explanation("Multiple <h1> headings dilute page topic clarity. Use <h2>-<h6> for subordinate section headings.")
                .impactLevel(IMPACT_LOW)
                .build());
        }
    }

    private void buildSchemaRecommendations(SeoMetrics seo, String domain, List<AiRecommendationDto> recs) {
        if (seo != null && !seo.isHasStructuredData()) {
            recs.add(AiRecommendationDto.builder()
                .category(CATEGORY_SEO)
                .issue("No JSON-LD structured schema markup detected.")
                .title("Embed WebSite JSON-LD Schema Markup")
                .codeSnippet("""
                    <script type="application/ld+json">
                    {
                      "@context": "https://schema.org",
                      "@type": "WebSite",
                      "name": "%s",
                      "url": "https://%s/"
                    }
                    </script>""".formatted(domain, domain))
                .explanation("Structured data schema helps search engine crawlers generate rich snippets in search results.")
                .impactLevel(IMPACT_MEDIUM)
                .build());
        }
    }

    private String capitalizeDomain(String domain) {
        if (domain == null || domain.isBlank()) return "Page Pulse";
        String name = domain.replace("www.", "").split("\\.")[0];
        if (name.isEmpty()) return domain;
        return Character.toUpperCase(name.charAt(0)) + name.substring(1);
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max);
    }
}

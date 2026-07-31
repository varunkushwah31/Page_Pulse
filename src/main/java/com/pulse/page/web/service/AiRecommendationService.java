package com.pulse.page.web.service;

import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.model.AccessibilityMetrics;
import com.pulse.page.web.model.ContentMetrics;
import com.pulse.page.web.model.SeoMetrics;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class AiRecommendationService {

    @Value("${GEMINI_API_KEY:}")
    private String geminiApiKey;

    @NonNull
    public List<AiRecommendationDto> generateRecommendations(@NonNull AuditResponse audit) {
        List<AiRecommendationDto> recommendations = new ArrayList<>();

        if (audit == null) {
            return recommendations;
        }

        SeoMetrics seo = audit.getSeoMetrics();
        ContentMetrics content = audit.getContentMetrics();
        AccessibilityMetrics a11y = audit.getAccessibilityMetrics();
        String domain = audit.getDomain() != null ? audit.getDomain() : "example.com";

        // 1. Title Tag Recommendation
        if (seo != null && (!seo.isHasTitle() || seo.getPageTitle() == null || seo.getPageTitle().isBlank())) {
            recommendations.add(AiRecommendationDto.builder()
                .category("SEO")
                .issue("Missing HTML <title> element in document <head>.")
                .title("Add Descriptive Page Title Tag")
                .codeSnippet("<title>" + capitalizeDomain(domain) + " | Official Website</title>")
                .explanation("Title tags define the document title displayed on Search Engine Results Pages (SERPs) and browser tabs. Keep titles between 50-60 characters.")
                .impactLevel("HIGH")
                .build());
        } else if (seo != null && seo.getTitleLength() > 60) {
            recommendations.add(AiRecommendationDto.builder()
                .category("SEO")
                .issue("Page title exceeds optimal 60 character SERP limit (" + seo.getTitleLength() + " chars).")
                .title("Optimize Page Title Length")
                .codeSnippet("<title>" + truncate(seo.getPageTitle(), 55) + "...</title>")
                .explanation("Search engines truncate titles longer than 60 characters. Truncate long titles to prevent awkward SERP clippings.")
                .impactLevel("MEDIUM")
                .build());
        }

        // 2. Meta Description Recommendation
        if (seo != null && (!seo.isHasMetaDescription() || seo.getMetaDescription() == null || seo.getMetaDescription().isBlank())) {
            recommendations.add(AiRecommendationDto.builder()
                .category("SEO")
                .issue("Missing meta description tag.")
                .title("Insert High-CTR Meta Description")
                .codeSnippet("<meta name=\"description\" content=\"Discover " + domain + " - explore features, performance insights, and comprehensive analytics tailored for your digital workflow.\">")
                .explanation("Meta descriptions inform search engine users about page content. A compelling meta description increases organic click-through rates (CTR).")
                .impactLevel("HIGH")
                .build());
        }

        // 3. Mobile Viewport Recommendation
        if (seo != null && !seo.isHasViewportMeta()) {
            recommendations.add(AiRecommendationDto.builder()
                .category("PERFORMANCE")
                .issue("Missing mobile-responsive viewport meta tag.")
                .title("Add Responsive Viewport Meta Tag")
                .codeSnippet("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
                .explanation("Tells mobile browsers how to render page width and initial zoom scale, ensuring mobile-friendliness.")
                .impactLevel("HIGH")
                .build());
        }

        // 4. OpenGraph Social Sharing Recommendation
        if (seo != null && !seo.isHasOgImage()) {
            recommendations.add(AiRecommendationDto.builder()
                .category("SEO")
                .issue("Missing OpenGraph social sharing image tag (og:image).")
                .title("Add OpenGraph Social Media Image Tag")
                .codeSnippet("<meta property=\"og:title\" content=\"" + (seo.getPageTitle() != null ? escapeHtml(seo.getPageTitle()) : domain) + "\">\n" +
                             "<meta property=\"og:description\" content=\"" + (seo.getMetaDescription() != null ? escapeHtml(seo.getMetaDescription()) : "Official site") + "\">\n" +
                             "<meta property=\"og:image\" content=\"https://" + domain + "/og-banner.png\">\n" +
                             "<meta property=\"og:type\" content=\"website\">")
                .explanation("Open Graph tags optimize how social networks (Twitter, LinkedIn, Facebook, Slack) display link previews when shared.")
                .impactLevel("MEDIUM")
                .build());
        }

        // 5. Accessibility: Missing Image Alt Attributes
        if (a11y != null && a11y.getImagesMissingAltCount() > 0) {
            recommendations.add(AiRecommendationDto.builder()
                .category("ACCESSIBILITY")
                .issue(a11y.getImagesMissingAltCount() + " image(s) on the page lack descriptive alt attributes.")
                .title("Add Descriptive Image Alt Attributes")
                .codeSnippet("<!-- Replace unlabeled image tags -->\n" +
                             "<img src=\"/hero.png\" alt=\"Illustration of " + domain + " analytics platform dashboard UI\" width=\"800\" height=\"400\" />")
                .explanation("Alt attributes provide alternative text for screen reader users and search engine image crawlers.")
                .impactLevel("HIGH")
                .build());
        }

        // 6. Accessibility: Missing HTML lang attribute
        if (a11y != null && !a11y.isHasHtmlLangAttribute()) {
            recommendations.add(AiRecommendationDto.builder()
                .category("ACCESSIBILITY")
                .issue("Missing language declaration attribute on <html> element.")
                .title("Set Primary Language Attribute on <html> Tag")
                .codeSnippet("<html lang=\"en\">")
                .explanation("Declaring document language enables screen readers to pronounce words correctly and assists search engines with geotargeting.")
                .impactLevel("MEDIUM")
                .build());
        }

        // 7. Content: Heading H1 Structure
        if (content != null) {
            int h1Count = content.getHeadingCounts() != null ? content.getHeadingCounts().getOrDefault("h1", 0) : 0;
            if (h1Count == 0) {
                recommendations.add(AiRecommendationDto.builder()
                    .category("CONTENT")
                    .issue("Page lacks a primary <h1> heading tag.")
                    .title("Insert Exactly One Primary <h1> Heading")
                    .codeSnippet("<h1 className=\"text-3xl font-bold\">" + (seo != null && seo.getPageTitle() != null ? escapeHtml(seo.getPageTitle()) : "Welcome to " + domain) + "</h1>")
                    .explanation("An <h1> heading specifies the main topic of the page for users and search engine indexers.")
                    .impactLevel("HIGH")
                    .build());
            } else if (h1Count > 1) {
                recommendations.add(AiRecommendationDto.builder()
                    .category("CONTENT")
                    .issue("Page contains " + h1Count + " <h1> heading tags. Standard WCAG guidelines recommend 1 main <h1> per page.")
                    .title("Consolidate Multiple <h1> Headings")
                    .codeSnippet("<!-- Keep single primary <h1> and convert subheadings to <h2> -->\n" +
                                 "<h1>Main Topic Header</h1>\n" +
                                 "<h2>Secondary Section Header</h2>")
                    .explanation("Multiple <h1> headings dilute page topic clarity. Use <h2>-<h6> for subordinate section headings.")
                    .impactLevel("LOW")
                    .build());
            }
        }

        // 8. SEO: Structured Data / JSON-LD Schema
        if (seo != null && !seo.isHasStructuredData()) {
            recommendations.add(AiRecommendationDto.builder()
                .category("SEO")
                .issue("No JSON-LD structured schema markup detected.")
                .title("Embed WebSite JSON-LD Schema Markup")
                .codeSnippet("<script type=\"application/ld+json\">\n" +
                             "{\n" +
                             "  \"@context\": \"https://schema.org\",\n" +
                             "  \"@type\": \"WebSite\",\n" +
                             "  \"name\": \"" + domain + "\",\n" +
                             "  \"url\": \"https://" + domain + "/\"\n" +
                             "}\n" +
                             "</script>")
                .explanation("Structured data schema helps search engine crawlers generate rich snippets in search results.")
                .impactLevel("MEDIUM")
                .build());
        }

        log.info("Generated {} AI code fix recommendations for target domain: {}", recommendations.size(), domain);
        return recommendations;
    }

    private String capitalizeDomain(String domain) {
        if (domain == null || domain.isBlank()) return "Page Pulse";
        String name = domain.replace("www.", "").split("\\.")[0];
        if (name.length() > 0) {
            return Character.toUpperCase(name.charAt(0)) + name.substring(1);
        }
        return name;
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max);
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }
}

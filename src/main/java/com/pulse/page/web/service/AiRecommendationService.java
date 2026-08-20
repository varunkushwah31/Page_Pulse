package com.pulse.page.web.service;

import com.pulse.page.web.config.AppProperties;
import com.pulse.page.web.dto.AiRecommendationDto;
import com.pulse.page.web.dto.AuditResponse;
import com.pulse.page.web.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@Autowired
public class AiRecommendationService {

    private static final String CATEGORY_SEO = "SEO";
    private static final String CATEGORY_ACCESSIBILITY = "ACCESSIBILITY";
    private static final String CATEGORY_PERFORMANCE = "PERFORMANCE";
    private static final String CATEGORY_CONTENT = "CONTENT";
    private static final String CATEGORY_SECURITY = "SECURITY";

    private static final String PRIORITY_P0 = "P0_CRITICAL";
    private static final String PRIORITY_P1 = "P1_MAJOR";
    private static final String PRIORITY_P2 = "P2_MODERATE";

    private static final String IMPACT_HIGH = "HIGH";
    private static final String IMPACT_MEDIUM = "MEDIUM";
    private static final String IMPACT_LOW = "LOW";

    private static final String SCORE_IMPROVE_HIGH = "+10 to +15 pts";
    private static final String SCORE_IMPROVE_MED_HIGH = "+5 to +10 pts";
    private static final String SCORE_IMPROVE_MEDIUM = "+5 to +8 pts";
    private static final String SCORE_IMPROVE_LOW = "+3 to +5 pts";

    private static final String TITLE_TAG = "<title>";
    private static final String DEFAULT_DOMAIN = "example.com";

    public AiRecommendationService() {
        // Default constructor
    }

    public AiRecommendationService(AppProperties appProperties) {
        // Maintained for backwards compatibility
    }

    public List<AiRecommendationDto> generateRecommendations(AuditResponse report) {
        if (report == null) {
            return Collections.emptyList();
        }

        List<AiRecommendationDto> recommendations = new ArrayList<>();
        SeoMetrics seo = report.getSeoMetrics();
        ContentMetrics content = report.getContentMetrics();
        AccessibilityMetrics a11y = report.getAccessibilityMetrics();
        PerformanceMetrics perf = report.getPerformanceMetrics();
        LinkInspectionMetrics links = report.getLinkMetrics();
        SecurityMetrics sec = report.getSecurityMetrics();
        AssetBottleneckMetrics bottlenecks = report.getAssetBottleneckMetrics();
        String domain = report.getDomain() != null && !report.getDomain().isBlank() ? report.getDomain() : extractDomainFromUrl(report.getUrl());

        buildSeoRecommendations(seo, domain, recommendations);
        buildAccessibilityRecommendations(a11y, domain, recommendations);
        buildContentRecommendations(content, recommendations);
        buildPerformanceRecommendations(perf, bottlenecks, recommendations);
        buildLinkSecurityRecommendations(links, sec, recommendations);
        buildSchemaRecommendations(seo, domain, recommendations);

        log.info("Generated {} prioritized AI code fix recommendations for target domain: {}", recommendations.size(), domain);
        return recommendations;
    }

    private void buildSeoRecommendations(SeoMetrics seo, String domain, List<AiRecommendationDto> recs) {
        if (seo == null) return;

        if (!seo.isHasTitle() || seo.getPageTitle() == null || seo.getPageTitle().isBlank()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P0)
                    .issue("Missing HTML <title> element in document <head>.")
                    .title("Add Descriptive Page Title Tag")
                    .codeSnippet(TITLE_TAG + capitalizeDomain(domain) + " | Official Website</title>")
                    .diffSnippet("- <head>\n+ <head>\n+   " + TITLE_TAG + capitalizeDomain(domain) + " | Official Website</title>")
                    .targetElementSelector("head")
                    .explanation("Title tags define the document title displayed on Search Engine Results Pages (SERPs) and browser tabs.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_HIGH)
                    .guidelineReference("Google Search Central: Title Tags")
                    .build());
        } else if (seo.getTitleLength() > 60) {
            String optimizedTitle = truncate(seo.getPageTitle(), 55) + "...";
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P2)
                    .issue("Page title exceeds optimal 60 character SERP limit (" + seo.getTitleLength() + " chars).")
                    .title("Optimize Page Title Length")
                    .codeSnippet(TITLE_TAG + optimizedTitle + "</title>")
                    .diffSnippet("- " + TITLE_TAG + seo.getPageTitle() + "</title>\n+ " + TITLE_TAG + optimizedTitle + "</title>")
                    .targetElementSelector("head > title")
                    .explanation("Search engines truncate titles longer than 60 characters (~600px). Truncate long titles to prevent clipping on mobile and desktop.")
                    .impactLevel(IMPACT_MEDIUM)
                    .estimatedScoreImprovement(SCORE_IMPROVE_LOW)
                    .guidelineReference("Google Search Central: Snippets")
                    .build());
        } else if (seo.getTitleLength() < 20) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P2)
                    .issue("Page title is too brief (" + seo.getTitleLength() + " chars).")
                    .title("Expand Descriptive Page Title")
                    .codeSnippet(TITLE_TAG + seo.getPageTitle() + " - " + capitalizeDomain(domain) + " Official Guide</title>")
                    .diffSnippet("- " + TITLE_TAG + seo.getPageTitle() + "</title>\n+ " + TITLE_TAG + seo.getPageTitle() + " - " + capitalizeDomain(domain) + " Official Guide</title>")
                    .targetElementSelector("head > title")
                    .explanation("Descriptive titles between 30-60 characters capture search intent and improve click-through rates.")
                    .impactLevel(IMPACT_MEDIUM)
                    .estimatedScoreImprovement(SCORE_IMPROVE_LOW)
                    .guidelineReference("Google Search Central: Title Best Practices")
                    .build());
        }

        if (!seo.isHasMetaDescription() || seo.getMetaDescription() == null || seo.getMetaDescription().isBlank()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P1)
                    .issue("Missing meta description tag.")
                    .title("Insert High-CTR Meta Description")
                    .codeSnippet("<meta name=\"description\" content=\"Discover " + domain + " - explore features, performance insights, and analytics.\">")
                    .diffSnippet("+ <meta name=\"description\" content=\"Discover " + domain + " - explore features, performance insights, and analytics.\">")
                    .targetElementSelector("head")
                    .explanation("Meta descriptions inform search engine users about page content. A compelling description increases organic CTR.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement("+8 to +10 pts")
                    .guidelineReference("Google Search Central: Meta Descriptions")
                    .build());
        }

        if ("MULTIPLE_CONFLICTING".equals(seo.getCanonicalStatus())) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P0)
                    .issue("Multiple conflicting canonical tags detected in DOM.")
                    .title("Consolidate Conflicting Canonical Tags")
                    .codeSnippet("<link rel=\"canonical\" href=\"https://" + domain + "/\">")
                    .diffSnippet("- <!-- Remove duplicate/conflicting canonical tags -->\n+ <link rel=\"canonical\" href=\"https://" + domain + "/\">")
                    .targetElementSelector("head > link[rel='canonical']")
                    .explanation("Multiple canonical tags confuse search engine crawlers and can invalidate canonicalization.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_HIGH)
                    .guidelineReference("Google Search Central: Canonicalization")
                    .build());
        } else if (seo.getCanonicalUrl() == null || seo.getCanonicalUrl().isBlank()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P1)
                    .issue("Missing canonical link reference.")
                    .title("Declare Self-Referencing Canonical Tag")
                    .codeSnippet("<link rel=\"canonical\" href=\"https://" + domain + "/\">")
                    .diffSnippet("+ <link rel=\"canonical\" href=\"https://" + domain + "/\">")
                    .targetElementSelector("head")
                    .explanation("Canonical tags prevent duplicate content issues by indicating the master URL to search indexing engines.")
                    .impactLevel(IMPACT_MEDIUM)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MEDIUM)
                    .guidelineReference("Google Search Central: Canonical URLs")
                    .build());
        }

        if (!seo.isOpenGraphComplete()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P2)
                    .issue("Incomplete OpenGraph social sharing meta tags.")
                    .title("Complete OpenGraph Social Metadata")
                    .codeSnippet("""
                            <meta property="og:title" content="%s">
                            <meta property="og:description" content="Discover %s insights.">
                            <meta property="og:image" content="https://%s/og-image.jpg">
                            <meta property="og:url" content="https://%s/">
                            <meta property="og:type" content="website">""".formatted(capitalizeDomain(domain), domain, domain, domain))
                    .diffSnippet("""
                            + <meta property="og:title" content="%s">
                            + <meta property="og:description" content="Discover %s insights.">
                            + <meta property="og:image" content="https://%s/og-image.jpg">
                            + <meta property="og:url" content="https://%s/">
                            + <meta property="og:type" content="website">""".formatted(capitalizeDomain(domain), domain, domain, domain))
                    .targetElementSelector("head")
                    .explanation("OpenGraph tags enable rich link preview cards across LinkedIn, Facebook, Slack, and Discord.")
                    .impactLevel(IMPACT_MEDIUM)
                    .estimatedScoreImprovement("+5 pts")
                    .guidelineReference("Open Graph Protocol (ogp.me)")
                    .build());
        }

        if (!seo.isHasViewportMeta()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P0)
                    .issue("Missing mobile responsive viewport meta tag.")
                    .title("Add Responsive Viewport Meta Tag")
                    .codeSnippet("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
                    .diffSnippet("+ <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
                    .targetElementSelector("head")
                    .explanation("The viewport meta tag ensures the page renders responsively on mobile devices and passes Google Mobile-Friendly checks.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_HIGH)
                    .guidelineReference("Google Search Central: Mobile-Friendly Design")
                    .build());
        }
    }

    private void buildAccessibilityRecommendations(AccessibilityMetrics a11y, String domain, List<AiRecommendationDto> recs) {
        if (a11y == null) return;

        if (a11y.getImagesMissingAltCount() > 0) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_ACCESSIBILITY)
                    .priority(PRIORITY_P0)
                    .issue(a11y.getImagesMissingAltCount() + " image(s) missing alt descriptive attributes.")
                    .title("Add Descriptive Alt Attributes to Images")
                    .codeSnippet("<img src=\"hero-banner.jpg\" alt=\"" + capitalizeDomain(domain) + " platform graphic\" width=\"800\" height=\"400\">")
                    .diffSnippet("- <img src=\"hero-banner.jpg\">\n+ <img src=\"hero-banner.jpg\" alt=\"" + capitalizeDomain(domain) + " platform graphic\" width=\"800\" height=\"400\">")
                    .targetElementSelector("img:not([alt]), img[alt='']")
                    .explanation("Screen readers and search crawlers rely on alt text to understand image context for visually impaired users.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_HIGH)
                    .guidelineReference("WCAG 2.1 SC 1.1.1 (Non-text Content)")
                    .build());
        }

        if (!a11y.isHasHtmlLangAttribute() || !a11y.isValidLangCode()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_ACCESSIBILITY)
                    .priority(PRIORITY_P1)
                    .issue("Missing or invalid lang attribute on root <html> element.")
                    .title("Declare Root HTML Language Attribute")
                    .codeSnippet("<html lang=\"en\">")
                    .diffSnippet("- <html>\n+ <html lang=\"en\">")
                    .targetElementSelector("html")
                    .explanation("Specifying a valid BCP 47 language code enables screen readers to apply proper pronunciation rules.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MEDIUM)
                    .guidelineReference("WCAG 2.1 SC 3.1.1 (Language of Page)")
                    .build());
        }

        if (a11y.getButtonsMissingAccessibleNameCount() > 0) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_ACCESSIBILITY)
                    .priority(PRIORITY_P1)
                    .issue(a11y.getButtonsMissingAccessibleNameCount() + " button(s) lack accessible text or aria-label attributes.")
                    .title("Add Accessible Names to Interactive Buttons")
                    .codeSnippet("<button type=\"button\" aria-label=\"Close modal menu\"><svg ... /></button>")
                    .diffSnippet("- <button type=\"button\"><svg ... /></button>\n+ <button type=\"button\" aria-label=\"Close modal menu\"><svg ... /></button>")
                    .targetElementSelector("button:not([aria-label])")
                    .explanation("Assistive technologies require discernible text or aria-label to announce button actions to users.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MED_HIGH)
                    .guidelineReference("WCAG 2.1 SC 4.1.2 (Name, Role, Value)")
                    .build());
        }

        if (a11y.getFormInputsMissingLabelsCount() > 0) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_ACCESSIBILITY)
                    .priority(PRIORITY_P1)
                    .issue(a11y.getFormInputsMissingLabelsCount() + " form input(s) missing associated <label> or aria-label.")
                    .title("Associate Explicit Labels with Form Inputs")
                    .codeSnippet("<label for=\"email-input\">Email Address</label>\n<input id=\"email-input\" type=\"email\" name=\"email\" placeholder=\"you@example.com\" />")
                    .diffSnippet("- <input type=\"email\" placeholder=\"you@example.com\" />\n+ <label for=\"email-input\">Email Address</label>\n+ <input id=\"email-input\" type=\"email\" name=\"email\" placeholder=\"you@example.com\" />")
                    .targetElementSelector("input:not([aria-label])")
                    .explanation("Every input field requires a descriptive label for screen reader users and assistive technology.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MEDIUM)
                    .guidelineReference("WCAG 2.1 SC 3.3.2 (Labels or Instructions)")
                    .build());
        }

        if (!a11y.isHasMainLandmark()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_ACCESSIBILITY)
                    .priority(PRIORITY_P2)
                    .issue("Document lacks a primary <main> semantic landmark region.")
                    .title("Wrap Primary Content in <main> Landmark")
                    .codeSnippet("<main id=\"main-content\" role=\"main\">\n  <!-- Primary page content -->\n</main>")
                    .diffSnippet("+ <main id=\"main-content\" role=\"main\">\n+   <!-- Primary page content -->\n+ </main>")
                    .targetElementSelector("body")
                    .explanation("Landmark regions enable keyboard and screen reader users to quickly bypass navigation bars.")
                    .impactLevel(IMPACT_MEDIUM)
                    .estimatedScoreImprovement(SCORE_IMPROVE_LOW)
                    .guidelineReference("WCAG 2.1 SC 1.3.1 (Info and Relationships)")
                    .build());
        }
    }

    private void buildContentRecommendations(ContentMetrics content, List<AiRecommendationDto> recs) {
        if (content == null) return;

        int h1Count = content.getHeadingCounts() != null ? content.getHeadingCounts().getOrDefault("h1", 0) : 0;
        if (h1Count == 0) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_CONTENT)
                    .priority(PRIORITY_P0)
                    .issue("Document contains zero <h1> heading tags.")
                    .title("Add Primary <h1> Document Heading")
                    .codeSnippet("<h1>Primary Topic or Brand Headline</h1>")
                    .diffSnippet("+ <h1>Primary Topic or Brand Headline</h1>")
                    .targetElementSelector("main")
                    .explanation("An <h1> heading specifies the main topic of the page for users and search engine indexers.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_HIGH)
                    .guidelineReference("W3C & Google On-Page SEO Best Practices")
                    .build());
        } else if (h1Count > 1) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_CONTENT)
                    .priority(PRIORITY_P2)
                    .issue("Page contains " + h1Count + " <h1> heading tags. Standard guidelines recommend 1 primary <h1>.")
                    .title("Consolidate Multiple <h1> Headings")
                    .codeSnippet("""
                            <!-- Use single primary <h1> and convert subordinate sections to <h2> -->
                            <h1>Main Topic Header</h1>
                            <h2>Secondary Section Header</h2>""")
                    .diffSnippet("""
                            - <h1>Main Topic Header</h1>
                            - <h1>Secondary Section Header</h1>
                            + <h1>Main Topic Header</h1>
                            + <h2>Secondary Section Header</h2>""")
                    .targetElementSelector("h1:nth-of-type(n+2)")
                    .explanation("Multiple <h1> headings dilute page topic clarity. Use <h2>-<h6> for subordinate section headings.")
                    .impactLevel(IMPACT_LOW)
                    .estimatedScoreImprovement(SCORE_IMPROVE_LOW)
                    .guidelineReference("WCAG 2.1 SC 1.3.1")
                    .build());
        }

        if (content.isThinContent()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_CONTENT)
                    .priority(PRIORITY_P1)
                    .issue("Page has low word count (" + content.getWordCount() + " words), risking thin content penalties.")
                    .title("Expand Comprehensive Body Content")
                    .codeSnippet("<p>Provide detailed, helpful, high-value paragraphs addressing user search intent...</p>")
                    .diffSnippet("+ <section class=\"content-body\">\n+   <p>Provide detailed, helpful, high-value paragraphs addressing user search intent...</p>\n+ </section>")
                    .targetElementSelector("main")
                    .explanation("Search engines prioritize authoritative, in-depth content that thoroughly answers search queries.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement("+8 to +12 pts")
                    .guidelineReference("Google Search Quality Rater Guidelines: Helpful Content")
                    .build());
        }

        if (content.isHasKeywordStuffing()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_CONTENT)
                    .priority(PRIORITY_P1)
                    .issue("Excessive keyword density detected (>3.5%), triggering keyword stuffing penalties.")
                    .title("Diversify Keyword Vocabulary with Natural Synonyms")
                    .codeSnippet("<!-- Replace repetitive target keywords with semantic LSI synonyms -->")
                    .diffSnippet("- Excessive repetitions of exact target phrases\n+ Natural language variations and contextual synonyms")
                    .targetElementSelector("body")
                    .explanation("Keyword stuffing harms user readability and search engine rankings. Keep keyword density below 2.5%.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MEDIUM)
                    .guidelineReference("Google Search Spam Policies: Keyword Stuffing")
                    .build());
        }
    }

    private void buildPerformanceRecommendations(PerformanceMetrics perf, AssetBottleneckMetrics bottlenecks, List<AiRecommendationDto> recs) {
        if (perf != null && perf.getRenderBlockingHeadScriptsCount() > 0) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_PERFORMANCE)
                    .priority(PRIORITY_P1)
                    .issue(perf.getRenderBlockingHeadScriptsCount() + " render-blocking script(s) located in <head>.")
                    .title("Add defer or async to Head Scripts")
                    .codeSnippet("<script src=\"bundle.js\" defer></script>")
                    .diffSnippet("- <script src=\"bundle.js\"></script>\n+ <script src=\"bundle.js\" defer></script>")
                    .targetElementSelector("head > script:not([defer]):not([async])")
                    .explanation("Deferring scripts prevents HTML parser blocking, significantly lowering First Contentful Paint (FCP).")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MED_HIGH)
                    .guidelineReference("Google Lighthouse Performance Audit")
                    .build());
        }

        if (perf != null && perf.getLegacyImageFormatsCount() > 0 && perf.getModernImageRatioPercentage() < 50.0) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_PERFORMANCE)
                    .priority(PRIORITY_P2)
                    .issue("Page uses legacy uncompressed image formats (PNG/JPEG) instead of next-gen formats (WebP/AVIF).")
                    .title("Convert Images to Next-Gen WebP/AVIF Formats")
                    .codeSnippet("<picture>\n  <source srcset=\"image.avif\" type=\"image/avif\">\n  <source srcset=\"image.webp\" type=\"image/webp\">\n  <img src=\"image.jpg\" alt=\"Description\" loading=\"lazy\" width=\"800\" height=\"400\">\n</picture>")
                    .diffSnippet("- <img src=\"image.jpg\" alt=\"Description\">\n+ <picture>\n+   <source srcset=\"image.avif\" type=\"image/avif\">\n+   <source srcset=\"image.webp\" type=\"image/webp\">\n+   <img src=\"image.jpg\" alt=\"Description\" loading=\"lazy\" width=\"800\" height=\"400\">\n+ </picture>")
                    .targetElementSelector("img[src$='.jpg'], img[src$='.png']")
                    .explanation("WebP and AVIF formats reduce file size by 30-70% compared to JPEG/PNG without quality loss.")
                    .impactLevel(IMPACT_MEDIUM)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MEDIUM)
                    .guidelineReference("Google Core Web Vitals Optimization")
                    .build());
        }

        if (bottlenecks != null && bottlenecks.getUnSizedImagesCount() > 0) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_PERFORMANCE)
                    .priority(PRIORITY_P1)
                    .issue(bottlenecks.getUnSizedImagesCount() + " image(s) lack explicit width and height attributes, causing Layout Shifts (CLS).")
                    .title("Add Width & Height Dimensions to Prevent CLS")
                    .codeSnippet("<img src=\"hero.jpg\" alt=\"Hero Banner\" width=\"1200\" height=\"630\" loading=\"eager\">")
                    .diffSnippet("- <img src=\"hero.jpg\" alt=\"Hero Banner\">\n+ <img src=\"hero.jpg\" alt=\"Hero Banner\" width=\"1200\" height=\"630\" loading=\"eager\">")
                    .targetElementSelector("img:not([width]):not([height])")
                    .explanation("Specifying aspect ratio dimensions allows browsers to reserve layout space, eliminating Cumulative Layout Shifts (CLS).")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MED_HIGH)
                    .guidelineReference("Google Core Web Vitals: Cumulative Layout Shift (CLS)")
                    .build());
        }
    }

    private void buildLinkSecurityRecommendations(LinkInspectionMetrics links, SecurityMetrics sec, List<AiRecommendationDto> recs) {
        if (links != null && links.getTargetBlankWithoutNoopenerCount() > 0) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SECURITY)
                    .priority(PRIORITY_P0)
                    .issue(links.getTargetBlankWithoutNoopenerCount() + " external link(s) use target=\"_blank\" without rel=\"noopener noreferrer\".")
                    .title("Mitigate Reverse Tabnabbing Vulnerability")
                    .codeSnippet("<a href=\"https://external.com\" target=\"_blank\" rel=\"noopener noreferrer\">External Link</a>")
                    .diffSnippet("- <a href=\"https://external.com\" target=\"_blank\">\n+ <a href=\"https://external.com\" target=\"_blank\" rel=\"noopener noreferrer\">")
                    .targetElementSelector("a[target='_blank']:not([rel*='noopener'])")
                    .explanation("Without rel=\"noopener noreferrer\", the target page can manipulate window.opener to redirect the parent tab to a phishing page.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MED_HIGH)
                    .guidelineReference("OWASP Web Security: Reverse Tabnabbing")
                    .build());
        }

        if (sec != null && sec.isHasMixedContent()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SECURITY)
                    .priority(PRIORITY_P0)
                    .issue(sec.getMixedContentCount() + " mixed content insecure HTTP resource(s) loaded over HTTPS.")
                    .title("Upgrade Insecure HTTP Resource Requests to HTTPS")
                    .codeSnippet("<meta http-equiv=\"Content-Security-Policy\" content=\"upgrade-insecure-requests\">")
                    .diffSnippet("+ <meta http-equiv=\"Content-Security-Policy\" content=\"upgrade-insecure-requests\">")
                    .targetElementSelector("head")
                    .explanation("Mixed content allows network attackers to intercept or modify insecure HTTP assets on otherwise encrypted HTTPS pages.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement(SCORE_IMPROVE_HIGH)
                    .guidelineReference("W3C Mixed Content Level 2")
                    .build());
        }
    }

    private void buildSchemaRecommendations(SeoMetrics seo, String domain, List<AiRecommendationDto> recs) {
        if (seo == null) return;

        StructuredDataInfo schemaInfo = seo.getStructuredDataInfo();
        if (schemaInfo != null && !schemaInfo.isValidJsonLd()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P0)
                    .issue("JSON-LD structured data contains syntax parsing errors.")
                    .title("Fix Malformed JSON-LD Syntax")
                    .codeSnippet("""
                            <script type="application/ld+json">
                            {
                              "@context": "https://schema.org",
                              "@type": "Organization",
                              "name": "%s",
                              "url": "https://%s/"
                            }
                            </script>""".formatted(capitalizeDomain(domain), domain))
                    .diffSnippet("""
                            - <script type="application/ld+json"> ... malformed json ... </script>
                            + <script type="application/ld+json">
                            + {
                            +   "@context": "https://schema.org",
                            +   "@type": "Organization",
                            +   "name": "%s",
                            +   "url": "https://%s/"
                            + }
                            + </script>""".formatted(capitalizeDomain(domain), domain))
                    .targetElementSelector("script[type='application/ld+json']")
                    .explanation("Syntax errors prevent Google from parsing structured data for rich snippet display.")
                    .impactLevel(IMPACT_HIGH)
                    .estimatedScoreImprovement("+8 to +12 pts")
                    .guidelineReference("Schema.org & Google Rich Results")
                    .build());
        } else if (!seo.isHasStructuredData()) {
            recs.add(AiRecommendationDto.builder()
                    .category(CATEGORY_SEO)
                    .priority(PRIORITY_P1)
                    .issue("No Schema.org JSON-LD structured data detected.")
                    .title("Embed Organization & WebSite JSON-LD Schema")
                    .codeSnippet("""
                            <script type="application/ld+json">
                            {
                              "@context": "https://schema.org",
                              "@type": "WebSite",
                              "name": "%s",
                              "url": "https://%s/"
                            }
                            </script>""".formatted(capitalizeDomain(domain), domain))
                    .diffSnippet("""
                            + <script type="application/ld+json">
                            + {
                            +   "@context": "https://schema.org",
                            +   "@type": "WebSite",
                            +   "name": "%s",
                            +   "url": "https://%s/"
                            + }
                            + </script>""".formatted(capitalizeDomain(domain), domain))
                    .targetElementSelector("head")
                    .explanation("Structured data schema helps search engine crawlers generate rich snippets in search results.")
                    .impactLevel(IMPACT_MEDIUM)
                    .estimatedScoreImprovement(SCORE_IMPROVE_MEDIUM)
                    .guidelineReference("Schema.org WebSite Specification")
                    .build());
        }
    }

    private String extractDomainFromUrl(String url) {
        if (url == null || url.isBlank()) return DEFAULT_DOMAIN;
        try {
            String clean = url.replace("http://", "").replace("https://", "");
            int slashIdx = clean.indexOf('/');
            if (slashIdx != -1) {
                clean = clean.substring(0, slashIdx);
            }
            int colonIdx = clean.indexOf(':');
            if (colonIdx != -1) {
                clean = clean.substring(0, colonIdx);
            }
            return clean.isBlank() ? DEFAULT_DOMAIN : clean;
        } catch (Exception _) {
            return DEFAULT_DOMAIN;
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


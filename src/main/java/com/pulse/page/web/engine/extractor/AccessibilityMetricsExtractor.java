package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.AccessibilityMetrics;
import com.pulse.page.web.model.DomIssueSnippet;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

@Slf4j
@Component
public class AccessibilityMetricsExtractor {

    private static final int MAX_SNIPPET_LENGTH = 500;
    private static final int MAX_ISSUES = 50;
    private static final Pattern ISO_LANG_PATTERN = Pattern.compile("^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$", Pattern.CASE_INSENSITIVE);

    public AccessibilityMetrics extract(Document doc) {
        if (doc == null) {
            return AccessibilityMetrics.builder()
                    .totalImageCount(0)
                    .imagesMissingAltCount(0)
                    .imagesMissingAltUrls(Collections.emptyList())
                    .hasHtmlLangAttribute(false)
                    .htmlLangValue(null)
                    .validLangCode(false)
                    .formInputsMissingLabelsCount(0)
                    .buttonsMissingAccessibleNameCount(0)
                    .linksMissingAccessibleTextCount(0)
                    .hasMainLandmark(false)
                    .hasHeaderLandmark(false)
                    .hasNavLandmark(false)
                    .hasFooterLandmark(false)
                    .positiveTabindexCount(0)
                    .mediaMissingCaptionsCount(0)
                    .hasTextDirection(false)
                    .textDirectionValue(null)
                    .wcagViolationsSummary(Collections.emptyList())
                    .domIssues(Collections.emptyList())
                    .build();
        }

        List<DomIssueSnippet> domIssues = new ArrayList<>();
        List<String> wcagViolations = new ArrayList<>();

        // 1. Image Alt Text Analysis
        ImageAltResult imageResult = extractImageAltMetrics(doc, domIssues);
        if (imageResult.missingAltCount > 0) {
            wcagViolations.add("WCAG 2.1 SC 1.1.1 (Non-text Content): " + imageResult.missingAltCount + " image(s) lack alternative text descriptions.");
        }

        // 2. HTML Language & Direction
        LangResult langResult = extractLangMetrics(doc);
        if (!langResult.hasLang) {
            wcagViolations.add("WCAG 2.1 SC 3.1.1 (Language of Page): Root <html> element missing lang attribute.");
        } else if (!langResult.validCode) {
            wcagViolations.add("WCAG 2.1 SC 3.1.1 (Language of Page): Root <html> lang attribute contains invalid BCP 47 language code: '" + langResult.langValue + "'.");
        }

        // 3. Form Controls Missing Labels
        int unlabelledInputs = countUnlabelledInputs(doc, domIssues);
        if (unlabelledInputs > 0) {
            wcagViolations.add("WCAG 2.1 SC 1.3.1 / 4.1.2 (Name, Role, Value): " + unlabelledInputs + " form control(s) lack accessible label associations.");
        }

        // 4. Buttons Missing Accessible Names
        int namelessButtons = countButtonsMissingAccessibleName(doc, domIssues);
        if (namelessButtons > 0) {
            wcagViolations.add("WCAG 2.1 SC 4.1.2 (Name, Role, Value): " + namelessButtons + " button(s) lack descriptive text or aria-label attributes.");
        }

        // 5. Links Missing Accessible Names
        int namelessLinks = countLinksMissingAccessibleText(doc, domIssues);
        if (namelessLinks > 0) {
            wcagViolations.add("WCAG 2.1 SC 2.4.4 (Link Purpose): " + namelessLinks + " link(s) lack discernible text for screen reader users.");
        }

        // 6. Landmarks Detection
        boolean hasMain = doc.selectFirst("main, [role=main]") != null;
        boolean hasHeader = doc.selectFirst("header, [role=banner]") != null;
        boolean hasNav = doc.selectFirst("nav, [role=navigation]") != null;
        boolean hasFooter = doc.selectFirst("footer, [role=contentinfo]") != null;

        if (!hasMain) {
            wcagViolations.add("WCAG 2.1 SC 1.3.1 (Info and Relationships): Page lacks a primary <main> landmark region for skip navigation.");
        }

        // 7. Positive Tabindex Check (Focus Order Disruptor)
        int positiveTabindex = countPositiveTabindex(doc, domIssues);
        if (positiveTabindex > 0) {
            wcagViolations.add("WCAG 2.1 SC 2.4.3 (Focus Order): " + positiveTabindex + " element(s) have positive tabindex (>0), which disrupts natural keyboard navigation order.");
        }

        // 8. Media Missing Captions
        int mediaMissingCaptions = countMediaMissingCaptions(doc);
        if (mediaMissingCaptions > 0) {
            wcagViolations.add("WCAG 2.1 SC 1.2.2 (Captions Prerecorded): " + mediaMissingCaptions + " video/audio element(s) lack caption or subtitle tracks.");
        }

        // 9. Text Direction
        Element htmlEl = doc.selectFirst("html");
        boolean hasDir = htmlEl != null && htmlEl.hasAttr("dir");
        String dirValue = hasDir ? htmlEl.attr("dir").trim() : null;

        return AccessibilityMetrics.builder()
                .totalImageCount(imageResult.totalImages)
                .imagesMissingAltCount(imageResult.missingAltCount)
                .imagesMissingAltUrls(imageResult.missingAltUrls)
                .hasHtmlLangAttribute(langResult.hasLang)
                .htmlLangValue(langResult.langValue)
                .validLangCode(langResult.validCode)
                .formInputsMissingLabelsCount(unlabelledInputs)
                .buttonsMissingAccessibleNameCount(namelessButtons)
                .linksMissingAccessibleTextCount(namelessLinks)
                .hasMainLandmark(hasMain)
                .hasHeaderLandmark(hasHeader)
                .hasNavLandmark(hasNav)
                .hasFooterLandmark(hasFooter)
                .positiveTabindexCount(positiveTabindex)
                .mediaMissingCaptionsCount(mediaMissingCaptions)
                .hasTextDirection(hasDir)
                .textDirectionValue(dirValue)
                .wcagViolationsSummary(wcagViolations)
                .domIssues(domIssues)
                .build();
    }

    private ImageAltResult extractImageAltMetrics(Document doc, List<DomIssueSnippet> domIssues) {
        Elements images = doc.select("img");
        int totalImages = images.size();
        List<String> missingAltUrls = new ArrayList<>();
        int missingAltCount = 0;

        for (Element img : images) {
            // If image is explicitly marked as decorative, it has alt="" or role="presentation"/"none"
            boolean isDecorative = (img.hasAttr("alt") && img.attr("alt").trim().isEmpty())
                    || "presentation".equalsIgnoreCase(img.attr("role"))
                    || "none".equalsIgnoreCase(img.attr("role"));

            if (!img.hasAttr("alt")) {
                missingAltCount++;
                String src = img.absUrl("src");
                if (src.isBlank()) {
                    src = img.attr("src");
                }
                if (missingAltUrls.size() < 25 && !src.isBlank()) {
                    missingAltUrls.add(src);
                }

                if (domIssues.size() < MAX_ISSUES) {
                    domIssues.add(DomIssueSnippet.builder()
                            .elementType("IMG")
                            .issueType("MISSING_ALT")
                            .outerHtml(truncateHtml(img.outerHtml()))
                            .selector(buildCssSelector(img))
                            .lineHint(estimateLineNumber(doc, img))
                            .build());
                }
            }
        }
        return new ImageAltResult(totalImages, missingAltCount, missingAltUrls);
    }

    private LangResult extractLangMetrics(Document doc) {
        Element htmlEl = doc.selectFirst("html");
        if (htmlEl == null || !htmlEl.hasAttr("lang") || htmlEl.attr("lang").isBlank()) {
            return new LangResult(false, null, false);
        }
        String lang = htmlEl.attr("lang").trim();
        boolean valid = ISO_LANG_PATTERN.matcher(lang).matches();
        return new LangResult(true, lang, valid);
    }

    private int countUnlabelledInputs(Document doc, List<DomIssueSnippet> domIssues) {
        Elements inputs = doc.select("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image]), select, textarea");
        int unlabelled = 0;
        for (Element input : inputs) {
            if (isFormElementMissingLabel(doc, input)) {
                unlabelled++;
                if (domIssues.size() < MAX_ISSUES) {
                    domIssues.add(DomIssueSnippet.builder()
                            .elementType("INPUT")
                            .issueType("MISSING_LABEL")
                            .outerHtml(truncateHtml(input.outerHtml()))
                            .selector(buildCssSelector(input))
                            .lineHint(estimateLineNumber(doc, input))
                            .build());
                }
            }
        }
        return unlabelled;
    }

    private boolean isFormElementMissingLabel(Document doc, Element input) {
        boolean hasAriaLabel = (input.hasAttr("aria-label") && !input.attr("aria-label").isBlank())
                || (input.hasAttr("aria-labelledby") && !input.attr("aria-labelledby").isBlank())
                || (input.hasAttr("title") && !input.attr("title").isBlank())
                || (input.hasAttr("placeholder") && !input.attr("placeholder").isBlank());

        boolean hasIdLabel = input.hasAttr("id") && !doc.select("label[for=\"" + input.attr("id") + "\"]").isEmpty();
        Element parent = input.parent();
        boolean isInsideLabel = parent != null && "label".equalsIgnoreCase(parent.tagName());

        return !hasAriaLabel && !hasIdLabel && !isInsideLabel;
    }

    private int countButtonsMissingAccessibleName(Document doc, List<DomIssueSnippet> domIssues) {
        Elements buttons = doc.select("button, [role=button]");
        int count = 0;
        for (Element btn : buttons) {
            String text = btn.text().trim();
            boolean hasAria = (btn.hasAttr("aria-label") && !btn.attr("aria-label").isBlank())
                    || (btn.hasAttr("aria-labelledby") && !btn.attr("aria-labelledby").isBlank())
                    || (btn.hasAttr("title") && !btn.attr("title").isBlank());
            boolean hasImgAlt = !btn.select("img[alt]:not([alt=\"\"])").isEmpty() || !btn.select("svg[aria-label]").isEmpty();

            if (text.isBlank() && !hasAria && !hasImgAlt) {
                count++;
                if (domIssues.size() < MAX_ISSUES) {
                    domIssues.add(DomIssueSnippet.builder()
                            .elementType("INPUT")
                            .issueType("MISSING_LABEL")
                            .outerHtml(truncateHtml(btn.outerHtml()))
                            .selector(buildCssSelector(btn))
                            .lineHint(estimateLineNumber(doc, btn))
                            .build());
                }
            }
        }
        return count;
    }

    private int countLinksMissingAccessibleText(Document doc, List<DomIssueSnippet> domIssues) {
        Elements links = doc.select("a[href]");
        int count = 0;
        for (Element a : links) {
            String text = a.text().trim();
            boolean hasAria = (a.hasAttr("aria-label") && !a.attr("aria-label").isBlank())
                    || (a.hasAttr("aria-labelledby") && !a.attr("aria-labelledby").isBlank())
                    || (a.hasAttr("title") && !a.attr("title").isBlank());
            boolean hasImgAlt = !a.select("img[alt]:not([alt=\"\"])").isEmpty() || !a.select("svg[aria-label]").isEmpty();

            if (text.isBlank() && !hasAria && !hasImgAlt) {
                count++;
            }
        }
        return count;
    }

    private int countPositiveTabindex(Document doc, List<DomIssueSnippet> domIssues) {
        Elements elementsWithTabindex = doc.select("[tabindex]");
        int count = 0;
        for (Element el : elementsWithTabindex) {
            try {
                int val = Integer.parseInt(el.attr("tabindex").trim());
                if (val > 0) {
                    count++;
                }
            } catch (NumberFormatException ignored) {
            }
        }
        return count;
    }

    private int countMediaMissingCaptions(Document doc) {
        Elements videos = doc.select("video");
        int count = 0;
        for (Element v : videos) {
            if (v.select("track[kind=captions], track[kind=subtitles]").isEmpty()) {
                count++;
            }
        }
        return count;
    }

    private String buildCssSelector(Element el) {
        StringBuilder sb = new StringBuilder();
        sb.append(el.tagName());

        if (el.hasAttr("id") && !el.attr("id").isBlank()) {
            sb.append("#").append(el.attr("id"));
        } else if (el.hasAttr("class") && !el.attr("class").isBlank()) {
            String firstClass = el.attr("class").trim().split("\\s+")[0];
            sb.append(".").append(firstClass);
        }

        if (el.hasAttr("src")) {
            String src = el.attr("src");
            if (src.length() > 50) src = src.substring(0, 50) + "...";
            sb.append("[src=\"").append(src).append("\"]");
        } else if (el.hasAttr("name")) {
            sb.append("[name=\"").append(el.attr("name")).append("\"]");
        }

        return sb.toString();
    }

    private int estimateLineNumber(Document doc, Element el) {
        String fullHtml = doc.outerHtml();
        String elHtml = el.outerHtml();
        int index = fullHtml.indexOf(elHtml);
        if (index < 0) return 0;

        int line = 1;
        for (int i = 0; i < Math.min(index, fullHtml.length()); i++) {
            if (fullHtml.charAt(i) == '\n') line++;
        }
        return line;
    }

    private String truncateHtml(String html) {
        if (html == null) return "";
        return html.length() > MAX_SNIPPET_LENGTH ? html.substring(0, MAX_SNIPPET_LENGTH) + "..." : html;
    }

    private record ImageAltResult(int totalImages, int missingAltCount, List<String> missingAltUrls) {}
    private record LangResult(boolean hasLang, String langValue, boolean validCode) {}
}

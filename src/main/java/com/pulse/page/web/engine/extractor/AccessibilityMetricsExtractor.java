package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.AccessibilityMetrics;
import com.pulse.page.web.model.DomIssueSnippet;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class AccessibilityMetricsExtractor {

    private static final int MAX_SNIPPET_LENGTH = 500;
    private static final int MAX_ISSUES = 50;

    public AccessibilityMetrics extract(Document doc) {
        if (doc == null) {
            return AccessibilityMetrics.builder()
                .totalImageCount(0)
                .imagesMissingAltCount(0)
                .imagesMissingAltUrls(List.of())
                .hasHtmlLangAttribute(false)
                .htmlLangValue(null)
                .formInputsMissingLabelsCount(0)
                .domIssues(List.of())
                .build();
        }

        List<DomIssueSnippet> domIssues = new ArrayList<>();
        ImageAltResult imageResult = extractImageAltMetrics(doc, domIssues);
        LangResult langResult = extractLangMetrics(doc);
        int unlabelledInputs = countUnlabelledInputs(doc, domIssues);

        return AccessibilityMetrics.builder()
            .totalImageCount(imageResult.totalImages)
            .imagesMissingAltCount(imageResult.missingAltCount)
            .imagesMissingAltUrls(imageResult.missingAltUrls)
            .hasHtmlLangAttribute(langResult.hasLang)
            .htmlLangValue(langResult.langValue)
            .formInputsMissingLabelsCount(unlabelledInputs)
            .domIssues(domIssues)
            .build();
    }

    private ImageAltResult extractImageAltMetrics(Document doc, List<DomIssueSnippet> domIssues) {
        Elements images = doc.select("img");
        int totalImages = images.size();
        List<String> missingAltUrls = new ArrayList<>();
        int missingAltCount = 0;

        for (Element img : images) {
            if (!img.hasAttr("alt") || img.attr("alt").trim().isEmpty()) {
                missingAltCount++;
                String src = img.absUrl("src");
                if (src.isBlank()) {
                    src = img.attr("src");
                }
                if (missingAltUrls.size() < 25 && !src.isBlank()) {
                    missingAltUrls.add(src);
                }

                // Collect DOM issue snippet for Visual Inspector
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
            return new LangResult(false, null);
        }
        return new LangResult(true, htmlEl.attr("lang").trim());
    }

    private int countUnlabelledInputs(Document doc, List<DomIssueSnippet> domIssues) {
        Elements inputs = doc.select("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image])");
        int unlabelledInputs = 0;
        for (Element input : inputs) {
            if (isInputMissingLabel(doc, input)) {
                unlabelledInputs++;

                // Collect DOM issue snippet for Visual Inspector
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
        return unlabelledInputs;
    }

    private boolean isInputMissingLabel(Document doc, Element input) {
        boolean hasAriaLabel = input.hasAttr("aria-label") || input.hasAttr("aria-labelledby");
        boolean hasIdLabel = input.hasAttr("id") && !doc.select("label[for=" + input.attr("id") + "]").isEmpty();
        Element parent = input.parent();
        boolean isInsideLabel = parent != null && "label".equalsIgnoreCase(parent.tagName());

        return !hasAriaLabel && !hasIdLabel && !isInsideLabel;
    }

    private static final String CLASS_ATTR = "class";

    /**
     * Build a CSS selector path for the given element for identification in the Visual Inspector.
     */
    private String buildCssSelector(Element el) {
        StringBuilder sb = new StringBuilder();
        sb.append(el.tagName());

        if (el.hasAttr("id") && !el.attr("id").isBlank()) {
            sb.append("#").append(el.attr("id"));
        } else if (el.hasAttr(CLASS_ATTR) && !el.attr(CLASS_ATTR).isBlank()) {
            String firstClass = el.attr(CLASS_ATTR).trim().split("\\s+")[0];
            sb.append(".").append(firstClass);
        }

        if (el.hasAttr("src")) {
            String src = el.attr("src");
            if (src.length() > 60) src = src.substring(0, 60) + "...";
            sb.append("[src=\"").append(src).append("\"]");
        } else if (el.hasAttr("name")) {
            sb.append("[name=\"").append(el.attr("name")).append("\"]");
        }

        return sb.toString();
    }

    /**
     * Estimate the line number of an element in the original HTML document.
     */
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
    private record LangResult(boolean hasLang, String langValue) {}
}

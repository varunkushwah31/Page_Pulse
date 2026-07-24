package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.AccessibilityMetrics;
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

    public AccessibilityMetrics extract(Document doc) {
        if (doc == null) {
            return AccessibilityMetrics.builder()
                .totalImageCount(0)
                .imagesMissingAltCount(0)
                .imagesMissingAltUrls(List.of())
                .hasHtmlLangAttribute(false)
                .htmlLangValue(null)
                .formInputsMissingLabelsCount(0)
                .build();
        }

        ImageAltResult imageResult = extractImageAltMetrics(doc);
        LangResult langResult = extractLangMetrics(doc);
        int unlabelledInputs = countUnlabelledInputs(doc);

        return AccessibilityMetrics.builder()
            .totalImageCount(imageResult.totalImages)
            .imagesMissingAltCount(imageResult.missingAltCount)
            .imagesMissingAltUrls(imageResult.missingAltUrls)
            .hasHtmlLangAttribute(langResult.hasLang)
            .htmlLangValue(langResult.langValue)
            .formInputsMissingLabelsCount(unlabelledInputs)
            .build();
    }

    private ImageAltResult extractImageAltMetrics(Document doc) {
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

    private int countUnlabelledInputs(Document doc) {
        Elements inputs = doc.select("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=image])");
        int unlabelledInputs = 0;
        for (Element input : inputs) {
            if (isInputMissingLabel(doc, input)) {
                unlabelledInputs++;
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

    private record ImageAltResult(int totalImages, int missingAltCount, List<String> missingAltUrls) {}
    private record LangResult(boolean hasLang, String langValue) {}
}

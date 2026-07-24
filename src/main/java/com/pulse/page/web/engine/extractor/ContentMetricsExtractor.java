package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.ContentMetrics;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class ContentMetricsExtractor {

    private static final int WORDS_PER_MINUTE = 200;

    public ContentMetrics extract(Document doc) {
        if (doc == null) {
            return ContentMetrics.builder()
                .headingCounts(Map.of())
                .wordCount(0)
                .estimatedReadingTimeMinutes(0)
                .paragraphCount(0)
                .textToHtmlRatioPercentage(0.0)
                .build();
        }

        Map<String, Integer> headingCounts = new HashMap<>();
        for (int i = 1; i <= 6; i++) {
            String tag = "h" + i;
            headingCounts.put(tag, doc.select(tag).size());
        }

        Document cleanDoc = doc.clone();
        cleanDoc.select("script, style, noscript, svg").remove();

        String rawHtml = doc.html();
        int totalHtmlLength = Math.max(1, rawHtml.length());

        Element bodyEl = cleanDoc.body();
        String visibleText = bodyEl.text();
        int textLength = visibleText.length();

        int wordCount = visibleText.isBlank() ? 0 : visibleText.trim().split("\\s+").length;

        int readingTimeMinutes = (int) Math.ceil((double) wordCount / WORDS_PER_MINUTE);
        Elements paragraphs = doc.select("p");

        double textToHtmlRatio = ((double) textLength / totalHtmlLength) * 100.0;

        return ContentMetrics.builder()
            .headingCounts(headingCounts)
            .wordCount(wordCount)
            .estimatedReadingTimeMinutes(readingTimeMinutes)
            .paragraphCount(paragraphs.size())
            .textToHtmlRatioPercentage(Math.round(textToHtmlRatio * 100.0) / 100.0)
            .build();
    }
}

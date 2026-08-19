package com.pulse.page.web.engine.extractor;

import com.pulse.page.web.model.ContentMetrics;
import com.pulse.page.web.model.HeadingNode;
import com.pulse.page.web.model.KeywordPhrase;
import com.pulse.page.web.model.ReadabilityMetrics;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Component
public class ContentMetricsExtractor {

    private static final int WORDS_PER_MINUTE = 200;

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
            "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "cannot", "could",
            "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have",
            "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
            "it", "its", "itself", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
            "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
            "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those",
            "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which",
            "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves",
            "will", "just", "also", "may", "get", "use", "one", "like", "us"
    );

    private static final Set<String> GENERIC_ANCHOR_PATTERNS = Set.of(
            "click here", "here", "read more", "learn more", "more", "link", "this", "website",
            "details", "view more", "continue reading", "see more", "go", "check this out"
    );

    private static final Pattern VOWEL_PATTERN = Pattern.compile("[aeiouy]+", Pattern.CASE_INSENSITIVE);

    public ContentMetrics extract(Document doc) {
        if (doc == null) {
            return ContentMetrics.builder()
                    .headingCounts(Collections.emptyMap())
                    .wordCount(0)
                    .characterCount(0)
                    .estimatedReadingTimeMinutes(0)
                    .paragraphCount(0)
                    .textToHtmlRatioPercentage(0.0)
                    .readabilityMetrics(ReadabilityMetrics.builder().build())
                    .headingHierarchy(Collections.emptyList())
                    .headingIssues(Collections.emptyList())
                    .duplicateHeadingTexts(Collections.emptyList())
                    .topKeywords(Collections.emptyList())
                    .genericAnchorWarnings(Collections.emptyList())
                    .build();
        }

        // 1. Heading Analysis & Hierarchy Tree
        Map<String, Integer> headingCounts = new HashMap<>();
        for (int i = 1; i <= 6; i++) {
            String tag = "h" + i;
            headingCounts.put(tag, doc.select(tag).size());
        }

        List<HeadingNode> headingHierarchy = new ArrayList<>();
        List<String> headingIssues = new ArrayList<>();
        List<String> duplicateHeadings = new ArrayList<>();
        Set<String> seenHeadingTexts = new HashSet<>();

        Elements headings = doc.select("h1, h2, h3, h4, h5, h6");
        int lastLevel = 0;
        int h1Count = 0;

        for (Element h : headings) {
            String tag = h.tagName().toLowerCase();
            int currentLevel = Integer.parseInt(tag.substring(1));
            String text = h.text().trim();
            int lineHint = estimateLineNumber(doc, h);

            List<String> issuesForNode = new ArrayList<>();

            if (currentLevel == 1) {
                h1Count++;
            }

            if (text.isBlank()) {
                issuesForNode.add("EMPTY_HEADING");
                headingIssues.add("Empty " + tag.toUpperCase() + " heading tag found (line ~" + lineHint + ")");
            } else {
                String normalizedText = text.toLowerCase();
                if (!seenHeadingTexts.add(normalizedText)) {
                    issuesForNode.add("DUPLICATE_TEXT");
                    duplicateHeadings.add(text);
                    headingIssues.add("Duplicate heading text: \"" + truncate(text, 40) + "\"");
                }
            }

            // Check hierarchy level skipping (e.g. H1 to H3 without H2)
            if (lastLevel > 0 && currentLevel > lastLevel + 1) {
                issuesForNode.add("SKIPPED_LEVEL");
                headingIssues.add("Heading level skipped: jumps from H" + lastLevel + " to H" + currentLevel + " without intermediate heading");
            }

            lastLevel = currentLevel;

            headingHierarchy.add(HeadingNode.builder()
                    .tag(tag)
                    .level(currentLevel)
                    .text(text)
                    .estimatedLine(lineHint)
                    .issues(issuesForNode)
                    .build());
        }

        if (h1Count == 0) {
            headingIssues.add(0, "Missing primary <h1> heading tag.");
        } else if (h1Count > 1) {
            headingIssues.add(0, "Multiple <h1> heading tags detected (" + h1Count + " tags found). WCAG & SEO best practices recommend 1 primary <h1> per page.");
        }

        boolean hasValidHeadingHierarchy = headingIssues.isEmpty();

        // 2. Visible Text & Paragraphs
        Document cleanDoc = doc.clone();
        cleanDoc.select("script, style, noscript, svg, nav, footer, header, form").remove();
        for (Element el : cleanDoc.select("h1, h2, h3, h4, h5, h6, p, li, blockquote, dt, dd")) {
            String elText = el.text().trim();
            if (!elText.isEmpty() && !elText.endsWith(".") && !elText.endsWith("!") && !elText.endsWith("?")) {
                el.appendText(". ");
            } else {
                el.appendText(" ");
            }
        }

        Element bodyEl = cleanDoc.body();
        String visibleText = (bodyEl != null ? bodyEl.text() : cleanDoc.text()).trim();
        int charCount = visibleText.length();

        String rawHtml = doc.html();
        int totalHtmlLength = Math.max(1, rawHtml.length());
        double textToHtmlRatio = ((double) charCount / totalHtmlLength) * 100.0;

        Elements paragraphs = doc.select("p");
        int paragraphCount = paragraphs.size();

        // 3. Word & Readability Metrics
        String[] rawWords = visibleText.isBlank() ? new String[0] : visibleText.split("\\s+");
        int wordCount = rawWords.length;
        int readingTimeMinutes = (int) Math.ceil((double) wordCount / WORDS_PER_MINUTE);

        ReadabilityMetrics readability = computeReadability(visibleText, rawWords);

        // 4. Keyword Density & N-Grams
        List<KeywordPhrase> topKeywords = extractNgrams(rawWords);
        boolean hasKeywordStuffing = topKeywords.stream().anyMatch(KeywordPhrase::isStuffingWarning);
        boolean isThinContent = wordCount < 300;

        // 5. In-Content Link Density & Generic Anchor Analysis
        Elements bodyLinks = doc.select("body a[href]");
        int wordsInsideLinks = 0;
        List<String> genericAnchorWarnings = new ArrayList<>();

        for (Element a : bodyLinks) {
            String anchorText = a.text().trim();
            if (!anchorText.isBlank()) {
                wordsInsideLinks += anchorText.split("\\s+").length;
                String normalizedAnchor = anchorText.toLowerCase();
                if (GENERIC_ANCHOR_PATTERNS.contains(normalizedAnchor)) {
                    genericAnchorWarnings.add("Generic non-descriptive anchor text: \"" + anchorText + "\"");
                }
            } else if (a.select("img").isEmpty()) {
                genericAnchorWarnings.add("Empty anchor tag with no text or image alt: " + truncate(a.attr("href"), 40));
            }
        }

        double linkDensity = wordCount > 0 ? ((double) wordsInsideLinks / wordCount) * 100.0 : 0.0;

        return ContentMetrics.builder()
                .headingCounts(headingCounts)
                .wordCount(wordCount)
                .characterCount(charCount)
                .estimatedReadingTimeMinutes(readingTimeMinutes)
                .paragraphCount(paragraphCount)
                .textToHtmlRatioPercentage(Math.round(textToHtmlRatio * 100.0) / 100.0)
                .readabilityMetrics(readability)
                .headingHierarchy(headingHierarchy)
                .headingIssues(headingIssues)
                .hasValidHeadingHierarchy(hasValidHeadingHierarchy)
                .duplicateHeadingTexts(duplicateHeadings)
                .topKeywords(topKeywords)
                .hasKeywordStuffing(hasKeywordStuffing)
                .isThinContent(isThinContent)
                .contentLinkDensityPercentage(Math.round(linkDensity * 100.0) / 100.0)
                .genericAnchorWarnings(genericAnchorWarnings)
                .build();
    }

    private ReadabilityMetrics computeReadability(String text, String[] words) {
        if (text.isBlank() || words.length == 0) {
            return ReadabilityMetrics.builder()
                    .readingEaseLevel("N/A")
                    .build();
        }

        // Sentences
        String[] sentences = text.split("(?<=[.!?])\\s+");
        int sentenceCount = Math.max(1, sentences.length);
        int totalWords = words.length;

        int totalSyllables = 0;
        int complexWordsCount = 0;
        int totalCharsWithoutSpaces = 0;

        for (String word : words) {
            String clean = word.replaceAll("[^a-zA-Z]", "").toLowerCase();
            totalCharsWithoutSpaces += clean.length();
            if (clean.isBlank()) continue;

            int syllables = countSyllables(clean);
            totalSyllables += syllables;
            if (syllables >= 3) {
                complexWordsCount++;
            }
        }

        double avgWordsPerSentence = (double) totalWords / sentenceCount;
        double avgSyllablesPerWord = totalWords > 0 ? (double) totalSyllables / totalWords : 1.0;
        double complexWordsPct = totalWords > 0 ? ((double) complexWordsCount / totalWords) * 100.0 : 0.0;

        // Flesch-Kincaid Reading Ease: 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords)
        double readingEase = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
        readingEase = Math.clamp(readingEase, 0.0, 100.0);

        // Flesch-Kincaid Grade Level: 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59
        double gradeLevel = (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59;
        gradeLevel = Math.max(0.0, gradeLevel);

        // Automated Readability Index (ARI): 4.71 * (characters / words) + 0.5 * (words / sentences) - 21.43
        double charsPerWord = totalWords > 0 ? (double) totalCharsWithoutSpaces / totalWords : 4.5;
        double ari = (4.71 * charsPerWord) + (0.5 * avgWordsPerSentence) - 21.43;
        ari = Math.max(0.0, ari);

        String level;
        if (readingEase >= 90) level = "Very Easy (5th Grade)";
        else if (readingEase >= 80) level = "Easy (6th Grade)";
        else if (readingEase >= 70) level = "Fairly Easy (7th Grade)";
        else if (readingEase >= 60) level = "Standard (8th-9th Grade)";
        else if (readingEase >= 50) level = "Fairly Difficult (10th-12th Grade)";
        else if (readingEase >= 30) level = "Difficult (College Level)";
        else level = "Very Difficult (Graduate Level)";

        return ReadabilityMetrics.builder()
                .fleschKincaidReadingEase(Math.round(readingEase * 10.0) / 10.0)
                .fleschKincaidGradeLevel(Math.round(gradeLevel * 10.0) / 10.0)
                .automatedReadabilityIndex(Math.round(ari * 10.0) / 10.0)
                .readingEaseLevel(level)
                .sentenceCount(sentenceCount)
                .averageWordsPerSentence(Math.round(avgWordsPerSentence * 10.0) / 10.0)
                .averageSyllablesPerWord(Math.round(avgSyllablesPerWord * 100.0) / 100.0)
                .complexWordsPercentage(Math.round(complexWordsPct * 10.0) / 10.0)
                .build();
    }

    private int countSyllables(String word) {
        if (word.length() <= 3) return 1;
        String w = word.toLowerCase();
        if (w.endsWith("e") && !w.endsWith("le") && !w.endsWith("ee")) {
            w = w.substring(0, w.length() - 1);
        }
        Matcher matcher = VOWEL_PATTERN.matcher(w);
        int count = 0;
        while (matcher.find()) {
            count++;
        }
        return Math.max(1, count);
    }

    private List<KeywordPhrase> extractNgrams(String[] rawWords) {
        if (rawWords.length == 0) return Collections.emptyList();

        List<String> cleanedTokens = new ArrayList<>();
        for (String w : rawWords) {
            String clean = w.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            if (!clean.isBlank() && !clean.matches("^\\d+$")) {
                cleanedTokens.add(clean);
            }
        }

        int totalTokens = Math.max(1, cleanedTokens.size());
        Map<String, Integer> unigramCounts = new HashMap<>();
        Map<String, Integer> bigramCounts = new HashMap<>();

        // Unigrams (filtered for stop words)
        for (String token : cleanedTokens) {
            if (token.length() >= 3 && !STOP_WORDS.contains(token)) {
                unigramCounts.put(token, unigramCounts.getOrDefault(token, 0) + 1);
            }
        }

        // Bigrams
        for (int i = 0; i < cleanedTokens.size() - 1; i++) {
            String t1 = cleanedTokens.get(i);
            String t2 = cleanedTokens.get(i + 1);
            if (!STOP_WORDS.contains(t1) && !STOP_WORDS.contains(t2) && t1.length() >= 3 && t2.length() >= 3) {
                String bigram = t1 + " " + t2;
                bigramCounts.put(bigram, bigramCounts.getOrDefault(bigram, 0) + 1);
            }
        }

        List<KeywordPhrase> result = new ArrayList<>();

        unigramCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(8)
                .forEach(e -> {
                    double density = Math.round(((double) e.getValue() / totalTokens * 100.0) * 100.0) / 100.0;
                    result.add(KeywordPhrase.builder()
                            .phrase(e.getKey())
                            .count(e.getValue())
                            .densityPercentage(density)
                            .nGramSize(1)
                            .isStuffingWarning(density > 3.5)
                            .build());
                });

        bigramCounts.entrySet().stream()
                .filter(e -> e.getValue() >= 2)
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(4)
                .forEach(e -> {
                    double density = Math.round(((double) e.getValue() / totalTokens * 100.0) * 100.0) / 100.0;
                    result.add(KeywordPhrase.builder()
                            .phrase(e.getKey())
                            .count(e.getValue())
                            .densityPercentage(density)
                            .nGramSize(2)
                            .isStuffingWarning(density > 3.0)
                            .build());
                });

        return result;
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

    private String truncate(String str, int max) {
        if (str == null) return "";
        return str.length() <= max ? str : str.substring(0, max) + "...";
    }
}

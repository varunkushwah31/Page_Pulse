package com.pulse.page.web.engine;

import com.pulse.page.web.dto.KeywordGapResponse;
import com.pulse.page.web.dto.KeywordGapResponse.KeywordFrequency;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;

import java.util.*;

@Slf4j
@Component
public class KeywordGapEngine {

    private static final Set<String> STOP_WORDS = Set.of(
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
        "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "cannot", "could",
        "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has", "have",
        "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
        "it", "its", "itself", "me", "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
        "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such",
        "than", "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this", "those",
        "through", "to", "too", "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which",
        "while", "who", "whom", "why", "with", "would", "you", "your", "yours", "yourself", "yourselves", "com", "http",
        "https", "www", "page", "site", "web"
    );

    @NonNull
    public KeywordGapResponse computeKeywordGap(String urlA, Document docA, String urlB, Document docB) {
        Map<String, Integer> freqA = extractKeywordFrequencies(docA);
        Map<String, Integer> freqB = extractKeywordFrequencies(docB);

        int totalWordsA = Math.max(1, freqA.values().stream().mapToInt(Integer::intValue).sum());
        int totalWordsB = Math.max(1, freqB.values().stream().mapToInt(Integer::intValue).sum());

        Set<String> allKeywords = new HashSet<>();
        allKeywords.addAll(freqA.keySet());
        allKeywords.addAll(freqB.keySet());

        List<KeywordFrequency> shared = new ArrayList<>();
        List<KeywordFrequency> uniqueA = new ArrayList<>();
        List<KeywordFrequency> missingB = new ArrayList<>();

        for (String word : allKeywords) {
            int countA = freqA.getOrDefault(word, 0);
            int countB = freqB.getOrDefault(word, 0);

            double densityA = Math.round(((double) countA / totalWordsA * 100.0) * 100.0) / 100.0;
            double densityB = Math.round(((double) countB / totalWordsB * 100.0) * 100.0) / 100.0;

            if (countA > 0 && countB > 0) {
                shared.add(new KeywordFrequency(word, countA, countB, densityA, densityB, "SHARED"));
            } else if (countA > 0) {
                uniqueA.add(new KeywordFrequency(word, countA, 0, densityA, 0.0, "UNIQUE_TARGET"));
            } else if (countB > 0) {
                missingB.add(new KeywordFrequency(word, 0, countB, 0.0, densityB, "MISSING_OPPORTUNITY"));
            }
        }

        // Sort by highest occurrence count
        shared.sort((x, y) -> Integer.compare(y.getCountUrlA() + y.getCountUrlB(), x.getCountUrlA() + x.getCountUrlB()));
        uniqueA.sort((x, y) -> Integer.compare(y.getCountUrlA(), x.getCountUrlA()));
        missingB.sort((x, y) -> Integer.compare(y.getCountUrlB(), x.getCountUrlB()));

        return KeywordGapResponse.builder()
            .urlA(urlA)
            .urlB(urlB)
            .totalKeywordsUrlA(freqA.size())
            .totalKeywordsUrlB(freqB.size())
            .sharedKeywords(shared.stream().limit(15).toList())
            .uniqueTargetKeywords(uniqueA.stream().limit(15).toList())
            .missingCompetitorOpportunities(missingB.stream().limit(15).toList())
            .build();
    }

    private Map<String, Integer> extractKeywordFrequencies(Document doc) {
        if (doc == null) return Collections.emptyMap();
        
        Document cleanDoc = doc.clone();
        cleanDoc.select("script, style, noscript, svg").remove();
        String text = cleanDoc.body().text().toLowerCase();

        String[] tokens = text.split("[^a-zA-Z0-9]+");
        Map<String, Integer> frequencies = new HashMap<>();

        for (String token : tokens) {
            String trimmed = token.trim();
            if (trimmed.length() >= 3 && !STOP_WORDS.contains(trimmed) && !trimmed.matches("^\\d+$")) {
                frequencies.put(trimmed, frequencies.getOrDefault(trimmed, 0) + 1);
            }
        }
        return frequencies;
    }
}

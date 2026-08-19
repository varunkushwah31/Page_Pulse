package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadabilityMetrics {
    private double fleschKincaidReadingEase;
    private double fleschKincaidGradeLevel;
    private double automatedReadabilityIndex;
    private String readingEaseLevel; // e.g. "Standard", "Fairly Easy", "Difficult"
    private int sentenceCount;
    private double averageWordsPerSentence;
    private double averageSyllablesPerWord;
    private double complexWordsPercentage; // words with >= 3 syllables
}

package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KeywordPhrase {
    private String phrase;
    private int count;
    private double densityPercentage;
    private int nGramSize; // 1 for single word, 2 for bigram, 3 for trigram
    private boolean isStuffingWarning; // true if density > 3.5%
}

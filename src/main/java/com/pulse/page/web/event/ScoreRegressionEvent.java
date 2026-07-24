package com.pulse.page.web.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ScoreRegressionEvent extends ApplicationEvent {

    private final String url;
    private final int previousScore;
    private final int currentScore;
    private final int scoreDrop;
    private final String webhookUrl;

    public ScoreRegressionEvent(Object source, String url, int previousScore, int currentScore, int scoreDrop, String webhookUrl) {
        super(source);
        this.url = url;
        this.previousScore = previousScore;
        this.currentScore = currentScore;
        this.scoreDrop = scoreDrop;
        this.webhookUrl = webhookUrl;
    }
}

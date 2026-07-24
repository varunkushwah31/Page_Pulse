package com.pulse.page.web.enums;

public enum HealthGrade {
    EXCELLENT,
    GOOD,
    NEEDS_IMPROVEMENT,
    POOR;

    public static HealthGrade fromScore(int score) {
        if (score >= 85) {
            return EXCELLENT;
        } else if (score >= 70) {
            return GOOD;
        } else if (score >= 50) {
            return NEEDS_IMPROVEMENT;
        } else {
            return POOR;
        }
    }
}

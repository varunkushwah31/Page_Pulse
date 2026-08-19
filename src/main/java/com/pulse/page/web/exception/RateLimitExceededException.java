package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class RateLimitExceededException extends PagePulseException {
    public RateLimitExceededException(String message) {
        super(message, HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED");
    }

    public RateLimitExceededException(String message, Throwable cause) {
        super(message, cause, HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMIT_EXCEEDED");
    }
}

package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class CircuitBreakerOpenException extends SiteLookException {
    public CircuitBreakerOpenException(String message) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE, "CIRCUIT_BREAKER_OPEN");
    }

    public CircuitBreakerOpenException(String message, Throwable cause) {
        super(message, cause, HttpStatus.SERVICE_UNAVAILABLE, "CIRCUIT_BREAKER_OPEN");
    }
}

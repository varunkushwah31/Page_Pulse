package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class ApiKeyNotFoundException extends PagePulseException {
    public ApiKeyNotFoundException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "API_KEY_NOT_FOUND");
    }

    public ApiKeyNotFoundException(String message, Throwable cause) {
        super(message, cause, HttpStatus.UNAUTHORIZED, "API_KEY_NOT_FOUND");
    }
}
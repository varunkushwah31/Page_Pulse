package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class AuthenticationException extends SiteLookException {
    public AuthenticationException(String message) {
        super(message, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_FAILED");
    }

    public AuthenticationException(String message, Throwable cause) {
        super(message, cause, HttpStatus.UNAUTHORIZED, "AUTHENTICATION_FAILED");
    }
}
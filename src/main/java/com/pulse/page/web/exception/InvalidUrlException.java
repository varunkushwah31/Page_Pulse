package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class InvalidUrlException extends PagePulseException {
    public InvalidUrlException(String message) {
        super(message, HttpStatus.BAD_REQUEST, "INVALID_URL");
    }

    public InvalidUrlException(String message, Throwable cause) {
        super(message, cause, HttpStatus.BAD_REQUEST, "INVALID_URL");
    }
}

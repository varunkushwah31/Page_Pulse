package com.pulse.page.web.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public abstract class SiteLookException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    protected SiteLookException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    protected SiteLookException(String message, Throwable cause, HttpStatus status, String errorCode) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }
}

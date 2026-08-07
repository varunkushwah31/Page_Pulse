package com.pulse.page.web.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public abstract class PagePulseException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    protected PagePulseException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    protected PagePulseException(String message, Throwable cause, HttpStatus status, String errorCode) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }
}

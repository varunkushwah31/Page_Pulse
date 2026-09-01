package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

/**
 * @deprecated Use {@link SiteLookException} instead.
 */
@Deprecated(since = "1.0.0", forRemoval = true)
public abstract class PagePulseException extends SiteLookException {

    protected PagePulseException(String message, HttpStatus status, String errorCode) {
        super(message, status, errorCode);
    }

    protected PagePulseException(String message, Throwable cause, HttpStatus status, String errorCode) {
        super(message, cause, status, errorCode);
    }
}

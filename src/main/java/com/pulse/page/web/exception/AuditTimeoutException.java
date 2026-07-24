package com.pulse.page.web.exception;

public class AuditTimeoutException extends AuditExecutionException {
    public AuditTimeoutException(String message) {
        super(message);
    }

    public AuditTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}

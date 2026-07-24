package com.pulse.page.web.exception;

public class AuditExecutionException extends RuntimeException {
    public AuditExecutionException(String message) {
        super(message);
    }

    public AuditExecutionException(String message, Throwable cause) {
        super(message, cause);
    }
}

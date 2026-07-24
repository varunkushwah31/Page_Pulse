package com.pulse.page.web.exception;

public class TargetHostUnreachableException extends AuditExecutionException {
    public TargetHostUnreachableException(String message) {
        super(message);
    }

    public TargetHostUnreachableException(String message, Throwable cause) {
        super(message, cause);
    }
}

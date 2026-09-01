package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class AuditExecutionException extends SiteLookException {
    public AuditExecutionException(String message) {
        super(message, HttpStatus.INTERNAL_SERVER_ERROR, "AUDIT_EXECUTION_FAILED");
    }

    public AuditExecutionException(String message, Throwable cause) {
        super(message, cause, HttpStatus.INTERNAL_SERVER_ERROR, "AUDIT_EXECUTION_FAILED");
    }
}

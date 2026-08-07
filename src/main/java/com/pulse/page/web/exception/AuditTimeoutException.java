package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class AuditTimeoutException extends PagePulseException {
    public AuditTimeoutException(String message) {
        super(message, HttpStatus.GATEWAY_TIMEOUT, "AUDIT_TIMEOUT");
    }

    public AuditTimeoutException(String message, Throwable cause) {
        super(message, cause, HttpStatus.GATEWAY_TIMEOUT, "AUDIT_TIMEOUT");
    }
}

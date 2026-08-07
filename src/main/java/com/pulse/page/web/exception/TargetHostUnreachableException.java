package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class TargetHostUnreachableException extends PagePulseException {
    public TargetHostUnreachableException(String message) {
        super(message, HttpStatus.BAD_GATEWAY, "TARGET_HOST_UNREACHABLE");
    }

    public TargetHostUnreachableException(String message, Throwable cause) {
        super(message, cause, HttpStatus.BAD_GATEWAY, "TARGET_HOST_UNREACHABLE");
    }
}

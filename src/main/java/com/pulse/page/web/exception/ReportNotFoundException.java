package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class ReportNotFoundException extends PagePulseException {
    public ReportNotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND, "REPORT_NOT_FOUND");
    }

    public ReportNotFoundException(String message, Throwable cause) {
        super(message, cause, HttpStatus.NOT_FOUND, "REPORT_NOT_FOUND");
    }
}

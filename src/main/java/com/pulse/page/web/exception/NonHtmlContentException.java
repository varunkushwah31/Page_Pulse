package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class NonHtmlContentException extends SiteLookException {
    public NonHtmlContentException(String message) {
        super(message, HttpStatus.BAD_REQUEST, "NON_HTML_CONTENT");
    }

    public NonHtmlContentException(String message, Throwable cause) {
        super(message, cause, HttpStatus.BAD_REQUEST, "NON_HTML_CONTENT");
    }
}

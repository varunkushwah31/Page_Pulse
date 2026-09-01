package com.pulse.page.web.exception;

import org.springframework.http.HttpStatus;

public class UserAlreadyExistsException extends SiteLookException {
    public UserAlreadyExistsException(String message) {
        super(message, HttpStatus.CONFLICT, "USER_ALREADY_EXISTS");
    }

    public UserAlreadyExistsException(String message, Throwable cause) {
        super(message, cause, HttpStatus.CONFLICT, "USER_ALREADY_EXISTS");
    }
}
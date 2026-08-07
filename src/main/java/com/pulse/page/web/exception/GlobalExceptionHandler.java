package com.pulse.page.web.exception;

import com.pulse.page.web.dto.ErrorResponse;
import com.pulse.page.web.filter.TraceIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(PagePulseException.class)
    public ResponseEntity<ErrorResponse> handlePagePulseException(PagePulseException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Domain exception at {}: {} ({})", traceId, request.getRequestURI(), ex.getMessage(), ex.getErrorCode());
        
        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            ex.getStatus().value(),
            ex.getErrorCode(),
            ex.getMessage(),
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(ex.getStatus()).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        String details = fieldErrors.entrySet().stream()
            .map(e -> e.getKey() + ": " + e.getValue())
            .collect(Collectors.joining(", "));

        log.warn("[Trace: {}] Validation failed at {}: {}", traceId, request.getRequestURI(), details);

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            "VALIDATION_ERROR",
            "Validation failed for one or more request fields.",
            request.getRequestURI(),
            traceId,
            fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        Map<String, String> violations = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v -> violations.put(v.getPropertyPath().toString(), v.getMessage()));

        log.warn("[Trace: {}] Constraint violation at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            "CONSTRAINT_VIOLATION",
            "Constraint violation on request parameters.",
            request.getRequestURI(),
            traceId,
            violations
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler({
        IllegalArgumentException.class,
        MissingServletRequestParameterException.class,
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Bad request at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            "BAD_REQUEST",
            ex.getMessage(),
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler({TargetHostUnreachableException.class, UnknownHostException.class, ConnectException.class})
    public ResponseEntity<ErrorResponse> handleConnectivityDrop(Exception ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.error("[Trace: {}] Target host connectivity drop at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_GATEWAY.value(),
            "TARGET_UNREACHABLE",
            "Network connectivity drop or unreachable target host: " + ex.getMessage(),
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
    }

    @ExceptionHandler({AuditTimeoutException.class, SocketTimeoutException.class})
    public ResponseEntity<ErrorResponse> handleTimeout(Exception ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.error("[Trace: {}] Audit timeout at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.GATEWAY_TIMEOUT.value(),
            "AUDIT_TIMEOUT",
            "Target server connection or read timed out: " + ex.getMessage(),
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(error);
    }

    @ExceptionHandler(org.jsoup.HttpStatusException.class)
    public ResponseEntity<ErrorResponse> handleJsoupHttpStatusException(org.jsoup.HttpStatusException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Jsoup HTTP exception at {}: status {} for URL {}", traceId, request.getRequestURI(), ex.getStatusCode(), ex.getUrl());
        
        HttpStatus status = ex.getStatusCode() == 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_GATEWAY;
        String message = ex.getStatusCode() == 403 
            ? "Access to target URL '" + ex.getUrl() + "' was blocked by the host server (HTTP 403 Forbidden)." 
            : "Target server returned HTTP " + ex.getStatusCode() + " for URL: " + ex.getUrl();

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            status.value(),
            "JSOUP_HTTP_ERROR",
            message,
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler({AccessDeniedException.class, AuthenticationException.class})
    public ResponseEntity<ErrorResponse> handleSecurityExceptions(Exception ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        HttpStatus status = ex instanceof AccessDeniedException ? HttpStatus.FORBIDDEN : HttpStatus.UNAUTHORIZED;
        String errorCode = ex instanceof AccessDeniedException ? "FORBIDDEN" : "UNAUTHORIZED";

        log.warn("[Trace: {}] Security exception at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            status.value(),
            errorCode,
            ex.getMessage(),
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler({DataAccessException.class, DataIntegrityViolationException.class})
    public ResponseEntity<ErrorResponse> handleDatabaseExceptions(Exception ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.error("[Trace: {}] Database error at {}: {}", traceId, request.getRequestURI(), ex.getMessage(), ex);

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "DATABASE_ERROR",
            "A database persistence error occurred while processing the request.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(NoResourceFoundException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.info("[Trace: {}] Resource not found at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.NOT_FOUND.value(),
            "RESOURCE_NOT_FOUND",
            "The requested resource or endpoint path does not exist.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnhandledException(Exception ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.error("[Trace: {}] Unhandled exception at {}: ", traceId, request.getRequestURI(), ex);

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "INTERNAL_SERVER_ERROR",
            "An unexpected internal error occurred: " + ex.getMessage(),
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private String getTraceId(HttpServletRequest request) {
        String traceId = MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY);
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader(TraceIdFilter.TRACE_ID_HEADER);
        }
        return traceId != null ? traceId : UUID.randomUUID().toString();
    }
}

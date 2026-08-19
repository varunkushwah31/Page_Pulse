package com.pulse.page.web.exception;

import com.pulse.page.web.dto.ErrorResponse;
import com.pulse.page.web.filter.CorrelationIdFilter;
import com.pulse.page.web.filter.TraceIdFilter;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeoutException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String CODE_VALIDATION_ERROR = "VALIDATION_ERROR";

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

        log.warn("[Trace: {}] Validation failed at {}: {}", traceId, request.getRequestURI(), fieldErrors);

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            CODE_VALIDATION_ERROR,
            "Validation failed for one or more request fields.",
            request.getRequestURI(),
            traceId,
            fieldErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ErrorResponse> handleHandlerMethodValidation(HandlerMethodValidationException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        Map<String, String> validationErrors = new LinkedHashMap<>();
        ex.getAllErrors().forEach(err -> {
            String field = err.getCodes() != null && err.getCodes().length > 0 ? err.getCodes()[0] : "parameter";
            validationErrors.put(field, err.getDefaultMessage());
        });

        log.warn("[Trace: {}] Handler method validation failed at {}: {}", traceId, request.getRequestURI(), validationErrors);

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            CODE_VALIDATION_ERROR,
            "Validation failed on controller method parameters.",
            request.getRequestURI(),
            traceId,
            validationErrors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        Map<String, String> violations = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(v -> violations.put(v.getPropertyPath().toString(), v.getMessage()));

        log.warn("[Trace: {}] Constraint violation at {}: {}", traceId, request.getRequestURI(), violations);

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

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameter(MissingServletRequestParameterException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Missing request parameter at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            "MISSING_PARAMETER",
            "Required request parameter '" + ex.getParameterName() + "' is missing.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        String expectedType = ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown";
        String message = "Parameter '" + ex.getName() + "' must be of type " + expectedType + ".";

        log.warn("[Trace: {}] Parameter type mismatch at {}: {}", traceId, request.getRequestURI(), message);

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            "INVALID_PARAMETER_TYPE",
            message,
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleHttpMessageNotReadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Malformed JSON request body at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            "MALFORMED_REQUEST_BODY",
            "Request body is malformed or cannot be parsed as valid JSON.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] HTTP method {} not supported at {}", traceId, ex.getMethod(), request.getRequestURI());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.METHOD_NOT_ALLOWED.value(),
            "METHOD_NOT_ALLOWED",
            "HTTP method '" + ex.getMethod() + "' is not supported for this endpoint.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Media type {} not supported at {}", traceId, ex.getContentType(), request.getRequestURI());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.UNSUPPORTED_MEDIA_TYPE.value(),
            "UNSUPPORTED_MEDIA_TYPE",
            "Content-Type '" + ex.getContentType() + "' is not supported.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(error);
    }

    @ExceptionHandler(HttpMediaTypeNotAcceptableException.class)
    public ResponseEntity<ErrorResponse> handleMediaTypeNotAcceptable(HttpMediaTypeNotAcceptableException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Media type not acceptable at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.NOT_ACCEPTABLE.value(),
            "NOT_ACCEPTABLE",
            "Could not produce an acceptable response according to the request Accept headers.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.NOT_ACCEPTABLE).body(error);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Payload size exceeded at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.PAYLOAD_TOO_LARGE.value(),
            "PAYLOAD_TOO_LARGE",
            "Uploaded file or payload exceeds the maximum allowed size limit.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(error);
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

    @ExceptionHandler({AuditTimeoutException.class, SocketTimeoutException.class, TimeoutException.class})
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

    @ExceptionHandler(CallNotPermittedException.class)
    public ResponseEntity<ErrorResponse> handleCircuitBreakerOpen(CallNotPermittedException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Circuit breaker open for service '{}' at {}", traceId, ex.getCausingCircuitBreakerName(), request.getRequestURI());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.SERVICE_UNAVAILABLE.value(),
            "CIRCUIT_BREAKER_OPEN",
            "The external target inspection service is temporarily degraded. Circuit breaker is OPEN.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    @ExceptionHandler(RequestNotPermitted.class)
    public ResponseEntity<ErrorResponse> handleRateLimitExceeded(RequestNotPermitted ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Resilience4j rate limit exceeded at {}", traceId, request.getRequestURI());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.TOO_MANY_REQUESTS.value(),
            "RATE_LIMIT_EXCEEDED",
            "Rate limit exceeded. Please slow down your requests.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, "60")
                .body(error);
    }

    @ExceptionHandler(org.jsoup.HttpStatusException.class)
    public ResponseEntity<ErrorResponse> handleJsoupHttpStatusException(org.jsoup.HttpStatusException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Jsoup HTTP exception at {}: status {} for URL {}", traceId, request.getRequestURI(), ex.getStatusCode(), ex.getUrl());

        HttpStatus status;
        String errorCode;
        String message;

        if (ex.getStatusCode() == 404) {
            status = HttpStatus.NOT_FOUND;
            errorCode = "TARGET_NOT_FOUND";
            message = "Target URL '" + ex.getUrl() + "' returned HTTP 404 Not Found.";
        } else if (ex.getStatusCode() == 403) {
            status = HttpStatus.FORBIDDEN;
            errorCode = "TARGET_ACCESS_FORBIDDEN";
            message = "Access to target URL '" + ex.getUrl() + "' was blocked by the host server (HTTP 403 Forbidden).";
        } else {
            status = HttpStatus.BAD_GATEWAY;
            errorCode = "TARGET_HTTP_ERROR";
            message = "Target server returned HTTP " + ex.getStatusCode() + " for URL: " + ex.getUrl();
        }

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            status.value(),
            errorCode,
            message,
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Invalid authentication credentials at {}", traceId, request.getRequestURI());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.UNAUTHORIZED.value(),
            "INVALID_CREDENTIALS",
            "Invalid username or password.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler({ExpiredJwtException.class, SignatureException.class, JwtException.class})
    public ResponseEntity<ErrorResponse> handleJwtExceptions(JwtException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] JWT token validation failure at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.UNAUTHORIZED.value(),
            "INVALID_JWT_TOKEN",
            "The supplied authentication token is invalid or expired.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Access denied at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.FORBIDDEN.value(),
            "FORBIDDEN",
            "Access is denied. You lack the required permissions to access this resource.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Authentication failed at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.UNAUTHORIZED.value(),
            "UNAUTHORIZED",
            "Authentication is required to access this resource.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Data integrity violation at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.CONFLICT.value(),
            "DATA_INTEGRITY_VIOLATION",
            "The operation conflicts with existing data or violates unique constraints.",
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ErrorResponse> handleDataAccessException(DataAccessException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.error("[Trace: {}] Database data access exception at {}: {}", traceId, request.getRequestURI(), ex.getMessage(), ex);

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

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.warn("[Trace: {}] Illegal argument at {}: {}", traceId, request.getRequestURI(), ex.getMessage());

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.BAD_REQUEST.value(),
            "INVALID_ARGUMENT",
            ex.getMessage(),
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnhandledException(Exception ex, HttpServletRequest request) {
        String traceId = getTraceId(request);
        log.error("[Trace: {}] Unhandled server error at {}: ", traceId, request.getRequestURI(), ex);

        ErrorResponse error = new ErrorResponse(
            Instant.now(),
            HttpStatus.INTERNAL_SERVER_ERROR.value(),
            "INTERNAL_SERVER_ERROR",
            "An unexpected internal error occurred. Please refer to trace ID: " + traceId,
            request.getRequestURI(),
            traceId
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    private String getTraceId(HttpServletRequest request) {
        String traceId = MDC.get(TraceIdFilter.MDC_TRACE_ID_KEY);
        if (traceId == null || traceId.isBlank()) {
            traceId = MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
        }
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader(TraceIdFilter.TRACE_ID_HEADER);
        }
        if (traceId == null || traceId.isBlank()) {
            traceId = request.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        }
        return traceId != null ? traceId : UUID.randomUUID().toString();
    }
}

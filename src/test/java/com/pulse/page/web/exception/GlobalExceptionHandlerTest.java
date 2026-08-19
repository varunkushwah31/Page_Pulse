package com.pulse.page.web.exception;

import com.pulse.page.web.dto.ErrorResponse;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.jsoup.HttpStatusException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @Mock
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        when(request.getRequestURI()).thenReturn("/api/audit");
    }

    @Test
    void handlePagePulseExceptionReturnsDomainStatusAndErrorCode() {
        InvalidUrlException ex = new InvalidUrlException("Invalid URL provided");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handlePagePulseException(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("INVALID_URL", response.getBody().error());
        assertEquals("Invalid URL provided", response.getBody().message());
    }

    @Test
    void handleMethodArgumentNotValidReturnsValidationDetails() {
        org.springframework.validation.BeanPropertyBindingResult bindingResult = 
            new org.springframework.validation.BeanPropertyBindingResult(new Object(), "auditRequest");
        bindingResult.addError(new FieldError("auditRequest", "url", "Target URL is required"));
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindingResult);

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMethodArgumentNotValid(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("VALIDATION_ERROR", response.getBody().error());
        assertTrue(response.getBody().details().containsKey("url"));
    }

    @Test
    void handleConstraintViolationReturnsViolationDetails() {
        @SuppressWarnings("unchecked")
        ConstraintViolation<Object> violation = mock(ConstraintViolation.class);
        Path path = mock(Path.class);
        when(path.toString()).thenReturn("url");
        when(violation.getPropertyPath()).thenReturn(path);
        when(violation.getMessage()).thenReturn("must not be empty");

        ConstraintViolationException ex = new ConstraintViolationException("Violations", Set.of(violation));
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleConstraintViolation(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("CONSTRAINT_VIOLATION", response.getBody().error());
    }

    @Test
    void handleConnectivityDropReturnsBadGateway() {
        UnknownHostException ex = new UnknownHostException("nonexistent-domain.xyz");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleConnectivityDrop(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("TARGET_UNREACHABLE", response.getBody().error());
    }

    @Test
    void handleConnectExceptionReturnsBadGateway() {
        ConnectException ex = new ConnectException("Connection refused");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleConnectivityDrop(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertEquals("TARGET_UNREACHABLE", response.getBody().error());
    }

    @Test
    void handleTimeoutReturnsGatewayTimeout() {
        SocketTimeoutException ex = new SocketTimeoutException("Read timed out");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTimeout(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.GATEWAY_TIMEOUT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("AUDIT_TIMEOUT", response.getBody().error());
    }

    @Test
    void handleJsoupHttpStatusException404ReturnsNotFound() {
        HttpStatusException ex = new HttpStatusException("Not Found", 404, "https://example.com/missing");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleJsoupHttpStatusException(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("TARGET_NOT_FOUND", response.getBody().error());
    }

    @Test
    void handleJsoupHttpStatusException403ReturnsForbidden() {
        HttpStatusException ex = new HttpStatusException("Forbidden", 403, "https://example.com/blocked");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleJsoupHttpStatusException(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("TARGET_ACCESS_FORBIDDEN", response.getBody().error());
    }

    @Test
    void handleJsoupHttpStatusException500ReturnsBadGateway() {
        HttpStatusException ex = new HttpStatusException("Internal Error", 500, "https://example.com/error");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleJsoupHttpStatusException(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertEquals("TARGET_HTTP_ERROR", response.getBody().error());
    }

    @Test
    void handleCircuitBreakerOpenReturnsServiceUnavailable() {
        CircuitBreaker cb = CircuitBreaker.of("scraperEngine", CircuitBreakerConfig.ofDefaults());
        CallNotPermittedException ex = CallNotPermittedException.createCallNotPermittedException(cb);

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleCircuitBreakerOpen(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertEquals("CIRCUIT_BREAKER_OPEN", response.getBody().error());
    }

    @Test
    void handleSecurityExceptionsReturnsProperHttpStatus() {
        AccessDeniedException accessDenied = new AccessDeniedException("Forbidden action");
        ResponseEntity<ErrorResponse> resp1 = exceptionHandler.handleAccessDenied(accessDenied, request);
        assertEquals(HttpStatus.FORBIDDEN, resp1.getStatusCode());

        BadCredentialsException badCreds = new BadCredentialsException("Bad credentials");
        ResponseEntity<ErrorResponse> resp2 = exceptionHandler.handleBadCredentials(badCreds, request);
        assertEquals(HttpStatus.UNAUTHORIZED, resp2.getStatusCode());

        AuthenticationException authEx = mock(AuthenticationException.class);
        when(authEx.getMessage()).thenReturn("Authentication required");
        ResponseEntity<ErrorResponse> resp3 = exceptionHandler.handleAuthenticationException(authEx, request);
        assertEquals(HttpStatus.UNAUTHORIZED, resp3.getStatusCode());

        JwtException jwtEx = new JwtException("Token expired");
        ResponseEntity<ErrorResponse> resp4 = exceptionHandler.handleJwtExceptions(jwtEx, request);
        assertEquals(HttpStatus.UNAUTHORIZED, resp4.getStatusCode());
    }

    @Test
    void handleDataIntegrityViolationReturnsConflict() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Duplicate key");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleDataIntegrityViolation(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("DATA_INTEGRITY_VIOLATION", response.getBody().error());
    }

    @Test
    void handleMissingServletRequestParameterReturnsBadRequest() {
        MissingServletRequestParameterException ex = new MissingServletRequestParameterException("url", "String");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMissingServletRequestParameter(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("MISSING_PARAMETER", response.getBody().error());
    }

    @Test
    void handleHttpMessageNotReadableReturnsBadRequest() {
        HttpMessageNotReadableException ex = mock(HttpMessageNotReadableException.class);
        when(ex.getMessage()).thenReturn("JSON parse error");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleHttpMessageNotReadable(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("MALFORMED_REQUEST_BODY", response.getBody().error());
    }

    @Test
    void handleMethodNotSupportedReturnsMethodNotAllowed() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("POST");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMethodNotSupported(ex, request);

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertEquals("METHOD_NOT_ALLOWED", response.getBody().error());
    }

    @Test
    void handleNoResourceFoundReturnsNotFound() {
        NoResourceFoundException ex = mock(NoResourceFoundException.class);
        when(ex.getMessage()).thenReturn("Resource not found");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleNoResourceFound(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("RESOURCE_NOT_FOUND", response.getBody().error());
    }

    @Test
    void handleUnhandledExceptionReturnsInternalServerError() {
        RuntimeException ex = new RuntimeException("Unexpected NPE");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleUnhandledException(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("INTERNAL_SERVER_ERROR", response.getBody().error());
        assertTrue(response.getBody().message().contains("Please refer to trace ID"));
    }
}

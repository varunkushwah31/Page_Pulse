package com.pulse.page.web.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter implements Filter {

    public static final String TRACE_ID_HEADER = "X-Trace-Id";
    public static final String MDC_TRACE_ID_KEY = "traceId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest httpRequest && response instanceof HttpServletResponse httpResponse) {
            String traceId = httpRequest.getHeader(TRACE_ID_HEADER);
            if (traceId == null || traceId.isBlank()) {
                traceId = httpRequest.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
            }
            if (traceId == null || traceId.isBlank()) {
                traceId = UUID.randomUUID().toString();
            }
            MDC.put(MDC_TRACE_ID_KEY, traceId);
            MDC.put(CorrelationIdFilter.CORRELATION_ID_MDC_KEY, traceId);
            httpResponse.setHeader(TRACE_ID_HEADER, traceId);
            httpResponse.setHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, traceId);
            try {
                chain.doFilter(request, response);
            } finally {
                MDC.remove(MDC_TRACE_ID_KEY);
                MDC.remove(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
            }
        } else {
            chain.doFilter(request, response);
        }
    }
}

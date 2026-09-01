package com.pulse.page.web.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.util.concurrent.TimeUnit;

@Configuration
public class MetricsConfig {

    private static final String TAG_ENDPOINT = "endpoint";
    private static final String TAG_STATUS = "status";

    private final MeterRegistry meterRegistry;

    public MetricsConfig(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    public void init() {
        meterRegistry.config().commonTags("application", "sitelook");
    }

    public Timer.Sample startAuditTimer() {
        return Timer.start(meterRegistry);
    }

    public void recordAuditDuration(Timer.Sample sample, String endpoint, String status) {
        sample.stop(Timer.builder("sitelook.audit.duration")
                .tag(TAG_ENDPOINT, endpoint)
                .tag(TAG_STATUS, status)
                .description("Audit execution duration")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry));
    }

    public void incrementAuditCounter(String endpoint, String status) {
        meterRegistry.counter("sitelook.audit.total", 
                TAG_ENDPOINT, endpoint, 
                TAG_STATUS, status).increment();
    }

    public void recordScrapedUrlSize(int bytes) {
        meterRegistry.summary("sitelook.scraped.content.size.bytes")
                .record(bytes);
    }

    public void recordResponseTime(String endpoint, long milliseconds) {
        Timer.builder("sitelook.http.response.time")
                .tag(TAG_ENDPOINT, endpoint)
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry)
                .record(milliseconds, TimeUnit.MILLISECONDS);
    }
}
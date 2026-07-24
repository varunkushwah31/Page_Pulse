package com.pulse.page.web.event;

import com.pulse.page.web.dto.AuditResponse;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class AuditCompletedEvent extends ApplicationEvent {

    private static final long serialVersionUID = 1L;

    private final transient AuditResponse auditResponse;
    private final String webhookUrl;

    public AuditCompletedEvent(Object source, AuditResponse auditResponse, String webhookUrl) {
        super(source);
        this.auditResponse = auditResponse;
        this.webhookUrl = webhookUrl;
    }
}

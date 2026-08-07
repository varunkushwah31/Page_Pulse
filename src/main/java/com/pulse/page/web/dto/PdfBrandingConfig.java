package com.pulse.page.web.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PdfBrandingConfig {
    private String companyName;      // e.g. "Acme Digital Agency"
    private String primaryColorHex;  // e.g. "#1E293B" or "#2563EB"
    private String headerText;       // e.g. "CLIENT AUDIT REPORT"
    private String footerText;       // e.g. "Confidential - Prepared for Acme Corp"
    private String logoBase64;       // Optional Base64-encoded image string
}

package com.pulse.page.web.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SitemapAuditRequest {

    @NotBlank(message = "Sitemap URL must not be blank.")
    private String sitemapUrl;

    @Builder.Default
    private int maxUrls = 15;
}

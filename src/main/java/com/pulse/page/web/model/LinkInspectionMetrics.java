package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkInspectionMetrics {
    private int totalLinksFound;
    private int workingLinksCount;
    private int brokenLinksCount;
    private int redirectLinksCount;
    private List<BrokenLinkInfo> brokenLinks;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BrokenLinkInfo {
        private String url;
        private String anchorText;
        private int statusCode;
        private String statusMessage;
        private boolean external;
    }
}

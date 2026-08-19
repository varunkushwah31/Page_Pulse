package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
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

    private int internalLinksCount;
    private int externalLinksCount;
    private int inPageAnchorLinksCount;
    private int protocolLinksCount; // mailto, tel, javascript

    private int targetBlankWithoutNoopenerCount;
    private int insecureHttpLinksCount;
    private int nofollowLinksCount;
    private int genericAnchorLinksCount;
    private int emptyAnchorLinksCount;

    @Builder.Default
    private List<String> securityWarnings = new ArrayList<>();

    @Builder.Default
    private List<BrokenLinkInfo> brokenLinks = new ArrayList<>();

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

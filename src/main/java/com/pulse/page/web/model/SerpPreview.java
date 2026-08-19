package com.pulse.page.web.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SerpPreview {
    private String displayedTitle;
    private String displayedUrl;
    private String displayedDescription;
    private int titlePixelWidth;
    private int descriptionPixelWidth;
    private boolean titleTruncated;
    private boolean descriptionTruncated;
    private String mobilePreviewTitle;
    private String mobilePreviewDescription;
}

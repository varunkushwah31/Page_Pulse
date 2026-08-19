package com.pulse.page.web.engine;

import com.pulse.page.web.model.AssetBottleneckMetrics;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.jspecify.annotations.NonNull;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class AssetBottleneckInspectorEngine {

    private static final String ATTR_WIDTH = "width";
    private static final String ATTR_HEIGHT = "height";
    private static final String ATTR_STYLE = "style";

    @NonNull
    public AssetBottleneckMetrics inspectAssets(Document doc, long responseTimeMs) {
        if (doc == null) {
            return AssetBottleneckMetrics.builder()
                .renderBlockingFontsCount(0)
                .unSizedImagesCount(0)
                .estimatedUnminifiedCssBytes(0)
                .estimatedUnminifiedJsBytes(0)
                .totalBlockingTimeMs(0)
                .bottleneckIssues(List.of())
                .build();
        }

        List<String> issues = new ArrayList<>();
        int renderBlockingFonts = inspectFonts(doc, issues);
        int unsizedImages = inspectUnsizedImages(doc, issues);

        // 3. Compute estimated CSS/JS byte wastage and Total Blocking Time (TBT)
        int scriptCount = doc.select("script[src]").size();
        int inlineScriptCount = doc.select("script:not([src])").size();
        int stylesheetCount = doc.select("link[rel~=stylesheet i]").size();

        long estimatedCssBytes = stylesheetCount * 45000L;
        long estimatedJsBytes = scriptCount * 75000L + inlineScriptCount * 12000L;
        long tbtMs = Math.clamp((long) (responseTimeMs * 0.25 + scriptCount * 35.0), 20L, 850L);

        if (renderBlockingFonts > 0) {
            log.info("Detected {} render-blocking font declarations missing display=swap", renderBlockingFonts);
        }
        if (unsizedImages > 0) {
            log.info("Detected {} images missing explicit dimensions contributing to CLS", unsizedImages);
        }

        return AssetBottleneckMetrics.builder()
            .renderBlockingFontsCount(renderBlockingFonts)
            .unSizedImagesCount(unsizedImages)
            .estimatedUnminifiedCssBytes(estimatedCssBytes)
            .estimatedUnminifiedJsBytes(estimatedJsBytes)
            .totalBlockingTimeMs(tbtMs)
            .bottleneckIssues(issues)
            .build();
    }

    private int inspectFonts(Document doc, List<String> issues) {
        Elements fontLinks = doc.select("link[href*=fonts.googleapis.com], link[href*=use.typekit.net], link[rel=stylesheet][href*=font]");
        int renderBlockingFonts = 0;
        for (Element fontLink : fontLinks) {
            String href = fontLink.attr("href").toLowerCase();
            if (!href.contains("display=swap") && !href.contains("display=optional")) {
                renderBlockingFonts++;
                issues.add("External font CSS '" + truncate(fontLink.attr("href"), 60) + "' lacks 'display=swap' parameter, causing render-blocking FOUT/FOIT.");
            }
        }
        return renderBlockingFonts;
    }

    private int inspectUnsizedImages(Document doc, List<String> issues) {
        Elements images = doc.select("img[src]");
        int unsizedImages = 0;
        for (Element img : images) {
            boolean hasWidth = img.hasAttr(ATTR_WIDTH) && !img.attr(ATTR_WIDTH).isBlank();
            boolean hasHeight = img.hasAttr(ATTR_HEIGHT) && !img.attr(ATTR_HEIGHT).isBlank();
            boolean hasInlineStyleDim = img.hasAttr(ATTR_STYLE) && (img.attr(ATTR_STYLE).contains(ATTR_WIDTH) || img.attr(ATTR_STYLE).contains(ATTR_HEIGHT));

            if (!hasWidth && !hasHeight && !hasInlineStyleDim) {
                unsizedImages++;
                if (unsizedImages <= 5) {
                    issues.add("Image '" + truncate(img.attr("src"), 50) + "' missing explicit width/height attributes (Causes CLS layout shifts).");
                }
            }
        }
        return unsizedImages;
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}

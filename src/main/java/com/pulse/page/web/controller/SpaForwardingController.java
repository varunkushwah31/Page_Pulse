package com.pulse.page.web.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardingController {

    @GetMapping(value = {
        "/",
        "/audit",
        "/sitemap",
        "/batch",
        "/schedule",
        "/scheduled",
        "/compare",
        "/trend",
        "/reports",
        "/stats",
        "/telemetry",
        "/dashboard",
        "/profile",
        "/landing",
        "/auth",
        "/login",
        "/signup"
    })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}

package com.pulse.page.web.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@Controller
public class SpaForwardingController {

    private final boolean hasStaticIndex = new ClassPathResource("static/index.html").exists();

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
        "/signup",
        "/collections"
    })
    public Object handleSpaRoutes() {
        if (hasStaticIndex) {
            return "forward:/index.html";
        }
        return getApiStatus();
    }

    @ResponseBody
    private ResponseEntity<Map<String, Object>> getApiStatus() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "Page Pulse Backend API",
            "message", "Backend API is running. Frontend is deployed on Vercel.",
            "health", "/actuator/health"
        ));
    }
}

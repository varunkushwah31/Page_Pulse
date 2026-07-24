package com.pulse.page.web.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Controller to forward client-side SPA routing requests to index.html.
 * Prevents 404 errors on browser page refreshes for non-API routes.
 */
@Controller
public class SpaForwardingController {

    @GetMapping(value = { "/", "/{path:[^\\.]*}", "/**/{path:[^\\.]*}" })
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}

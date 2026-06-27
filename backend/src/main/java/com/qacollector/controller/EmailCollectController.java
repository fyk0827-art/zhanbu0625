package com.qacollector.controller;

import com.qacollector.service.EmailCollectService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class EmailCollectController {

    private final EmailCollectService emailCollectService;

    public EmailCollectController(EmailCollectService emailCollectService) {
        this.emailCollectService = emailCollectService;
    }

    @PostMapping("/collect-email")
    public Map<String, Object> collectEmail(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String source = body.get("source");
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("email is required");
        }
        emailCollectService.saveEmail(email, source);
        return Map.of("ok", true);
    }
}

package com.lifeblueprint.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class DeepSeekService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String API_URL = "https://api.deepseek.com/chat/completions";
    private static final String API_KEY = "sk-9207a76a3a5f460796e9f437e16524ed";

    public String generate(String systemPrompt, String userPrompt) {
        System.out.println("[DeepSeekService] Calling DeepSeek API... (prompt len: SP=" + systemPrompt.length() + " UP=" + userPrompt.length() + ")");
        long start = System.currentTimeMillis();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(API_KEY);

        Map<String, Object> messages = Map.of(
            "model", "deepseek-v4-pro",
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
            ),
            "max_tokens", 16384,
            "temperature", 0.1,
            "stream", false
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(messages, headers);
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(API_URL, request, Map.class);
            Map body = response.getBody();
            if (body == null) {
                throw new RuntimeException("DeepSeek API returned empty response");
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) body.get("choices");
            if (choices == null || choices.isEmpty()) {
                throw new RuntimeException("DeepSeek API returned no choices");
            }

            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message == null) {
                throw new RuntimeException("DeepSeek API returned no message");
            }

            String content = (String) message.get("content");
            if (content == null) {
                throw new RuntimeException("DeepSeek API returned no content");
            }

            long elapsed = System.currentTimeMillis() - start;
            System.out.println("[DeepSeekService] Done in " + elapsed + "ms, " + content.length() + " chars");
            return content;
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            System.err.println("[DeepSeekService] API error after " + elapsed + "ms: " + e.getMessage());
            throw e;
        }
    }
}

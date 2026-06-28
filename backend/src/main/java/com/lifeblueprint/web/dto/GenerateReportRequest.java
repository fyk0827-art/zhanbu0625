package com.lifeblueprint.web.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GenerateReportRequest(
        String systemPrompt,
        String userPrompt,
        String previewText,
        String displayName,
        String userEmail,
        JsonNode chartJson
) {}

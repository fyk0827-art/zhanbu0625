package com.qacollector.controller;

import com.qacollector.dto.*;
import com.qacollector.service.QuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/questions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminQuestionController {
    private final QuestionService questionService;

    @GetMapping
    public ApiResponse<List<AdminQuestionDTO>> list() {
        return ApiResponse.ok(questionService.getAllQuestionsAdmin());
    }

    @PostMapping
    public ApiResponse<Long> create(@RequestBody CreateQuestionRequest req) {
        return ApiResponse.ok(questionService.createQuestion(req));
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @RequestBody CreateQuestionRequest req) {
        questionService.updateQuestion(id, req);
        return ApiResponse.ok(null);
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        questionService.deleteQuestion(id);
        return ApiResponse.ok(null);
    }

    @PostMapping("/clear-cache")
    @CacheEvict(value = "questionBank", allEntries = true)
    public Map<String, Object> clearCache() {
        return Map.of("ok", true, "message", "Question cache cleared");
    }
}

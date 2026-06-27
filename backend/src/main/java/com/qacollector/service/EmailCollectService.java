package com.qacollector.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class EmailCollectService {

    private final JdbcTemplate jdbc;

    public EmailCollectService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        ensureTable();
    }

    private void ensureTable() {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS user_emails (
              id BIGINT AUTO_INCREMENT PRIMARY KEY,
              email VARCHAR(320) NOT NULL,
              source VARCHAR(64) NOT NULL DEFAULT 'quiz',
              created_at BIGINT NOT NULL,
              INDEX idx_user_emails_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """);
    }

    public void saveEmail(String email, String source) {
        if (email == null || email.isBlank()) return;
        jdbc.update(
            "INSERT IGNORE INTO user_emails (email, source, created_at) VALUES (?, ?, ?)",
            email.trim().toLowerCase(), source != null ? source : "quiz", Instant.now().toEpochMilli()
        );
    }
}

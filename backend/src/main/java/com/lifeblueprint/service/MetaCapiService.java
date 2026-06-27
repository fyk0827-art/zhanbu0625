package com.lifeblueprint.service;

import com.lifeblueprint.domain.OrderRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MetaCapiService {

    @Value("${meta.pixel-id:1000287272912455}")
    private String pixelId;

    @Value("${meta.capi-access-token:}")
    private String accessToken;

    @Value("${meta.test-event-code:}")
    private String testEventCode;

    @Value("${meta.product-name:Full Life Blueprint Report}")
    private String productName;

    @Value("${meta.currency:USD}")
    private String currency;

    private final JdbcTemplate jdbc;
    private final RestTemplate restTemplate;

    public MetaCapiService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.restTemplate = new RestTemplate();
        ensureTable();
    }

    private void ensureTable() {
        jdbc.execute("""
            CREATE TABLE IF NOT EXISTS facebook_events (
              order_id VARCHAR(64) NOT NULL PRIMARY KEY,
              event_id VARCHAR(128) NOT NULL,
              status VARCHAR(16) NOT NULL DEFAULT 'pending',
              response_text TEXT NULL,
              created_at BIGINT NOT NULL,
              updated_at BIGINT NOT NULL,
              INDEX idx_facebook_events_status (status),
              INDEX idx_facebook_events_event_id (event_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """);
    }

    public void sendPurchase(OrderRecord order, String clientIp, String userAgent, String fbp, String fbc) {
        if (accessToken == null || accessToken.isBlank()) return;
        if (order.status() != com.lifeblueprint.domain.OrderStatus.paid) return;

        String eventId = order.id();

        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM facebook_events WHERE order_id = ? AND status = 'success'",
            Integer.class, eventId
        );
        if (count != null && count > 0) return;

        long eventTime = System.currentTimeMillis() / 1000;

        Map<String, Object> userData = new LinkedHashMap<>();
        userData.put("client_ip_address", clientIp != null ? clientIp : "127.0.0.1");
        userData.put("client_user_agent", userAgent != null ? userAgent : "unknown");
        if (fbp != null && !fbp.isBlank()) userData.put("fbp", fbp);
        if (fbc != null && !fbc.isBlank()) userData.put("fbc", fbc);

        Map<String, Object> customData = new LinkedHashMap<>();
        customData.put("currency", currency);
        customData.put("value", order.amount() / 100.0);
        customData.put("content_name", productName);

        Map<String, Object> event = new LinkedHashMap<>();
        event.put("event_name", "Purchase");
        event.put("event_time", eventTime);
        event.put("event_id", eventId);
        event.put("action_source", "website");
        event.put("event_source_url", "http://localhost:3033/generator/final-report?orderId=" + order.id());
        event.put("user_data", userData);
        event.put("custom_data", customData);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("data", List.of(event));
        if (testEventCode != null && !testEventCode.isBlank()) {
            body.put("test_event_code", testEventCode);
        }

        jdbc.update(
            "INSERT INTO facebook_events (order_id, event_id, status, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?)",
            eventId, eventId, System.currentTimeMillis(), System.currentTimeMillis()
        );

        try {
            String url = "https://graph.facebook.com/v19.0/" + pixelId + "/events?access_token=" + accessToken;
            String response = restTemplate.postForObject(url, body, String.class);

            jdbc.update(
                "UPDATE facebook_events SET status = 'success', response_text = ?, updated_at = ? WHERE order_id = ?",
                response, System.currentTimeMillis(), eventId
            );
        } catch (Exception e) {
            jdbc.update(
                "UPDATE facebook_events SET status = 'failed', response_text = ?, updated_at = ? WHERE order_id = ?",
                e.getMessage(), System.currentTimeMillis(), eventId
            );
        }
    }
}

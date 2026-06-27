package com.qacollector.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final JdbcTemplate jdbc;

    public AdminOrderController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public Map<String, Object> listOrders(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        int offset = (page - 1) * pageSize;

        Integer total = jdbc.queryForObject("SELECT COUNT(*) FROM orders", Integer.class);

        List<Map<String, Object>> items = jdbc.query(
            "SELECT id, report_id, amount, title, channel, status, trade_no, payer_contact, created_at, paid_at " +
            "FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (rs, rowNum) -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("orderId", rs.getString("id"));
                m.put("reportId", rs.getString("report_id"));
                m.put("amount", rs.getInt("amount"));
                m.put("amountYuan", String.format("%.2f", rs.getInt("amount") / 100.0));
                m.put("title", rs.getString("title"));
                m.put("channel", rs.getString("channel"));
                m.put("status", rs.getString("status"));
                m.put("tradeNo", rs.getString("trade_no"));
                m.put("payerContact", rs.getString("payer_contact"));
                m.put("createdAt", rs.getLong("created_at"));
                m.put("paidAt", rs.getLong("paid_at"));
                return m;
            },
            pageSize, offset
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("total", total != null ? total : 0);
        result.put("page", page);
        result.put("pageSize", pageSize);
        return result;
    }
}

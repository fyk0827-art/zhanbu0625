package com.lifeblueprint.domain;

public record OrderRecord(
        String id,
        String reportId,
        int amount,
        String title,
        String channel,
        OrderStatus status,
        String tradeNo,
        String payerContact,
        long createdAt,
        Long paidAt,
        String fbp,
        String fbc
) {
        public OrderRecord(String id, String reportId, int amount, String title, String channel, OrderStatus status, String tradeNo, String payerContact, long createdAt, Long paidAt) {
                this(id, reportId, amount, title, channel, status, tradeNo, payerContact, createdAt, paidAt, null, null);
        }
}

package com.lifeblueprint.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeblueprint.config.PaymentProperties;
import com.lifeblueprint.domain.OrderRecord;
import com.lifeblueprint.domain.OrderStatus;
import com.lifeblueprint.domain.ReportRecord;
import com.lifeblueprint.domain.UnlockRecord;
import com.lifeblueprint.repository.PaymentRepository;
import com.lifeblueprint.web.dto.CreateOrderRequest;
import com.lifeblueprint.web.dto.SaveReportRequest;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PaymentService {

    private final PaymentRepository repo;
    private final PaymentProperties props;
    private final PaypalService paypal;
    private final ObjectMapper objectMapper;

    public PaymentService(
            PaymentRepository repo,
            PaymentProperties props,
            PaypalService paypal,
            ObjectMapper objectMapper,
            EmailService emailService,
            MetaCapiService metaCapi,
            com.qacollector.service.SettingsService settingsService
    ) {
        this.repo = repo;
        this.props = props;
        this.paypal = paypal;
        this.objectMapper = objectMapper;
        this.emailService = emailService;
        this.metaCapi = metaCapi;
        this.settingsService = settingsService;
    }

    public boolean isDatabaseUp() {
        try {
            return repo.ping();
        } catch (Exception e) {
            return false;
        }
    }

    public Map<String, Object> health() {
        boolean dbOk = isDatabaseUp();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", dbOk);
        body.put("paymentMode", props.getMode());
        body.put("paypalConfigured", props.getPaypal().isConfigured());
        body.put("database", dbOk ? "connected" : "disconnected");
        body.put("runtime", "spring-boot-java21");
        String reportPrice = settingsService.getReportPrice();
        body.put("priceYuan", reportPrice);
        body.put("priceCents", (int) (Double.parseDouble(reportPrice) * 100));
        if (props.isPaypalMode() && !props.getPaypal().isConfigured()) {
            body.put(
                    "warning",
                    "PAYMENT_MODE=paypal 但未配置 client-id/secret，创建订单会失败。请配置或改用 mock"
            );
        }
        if (!dbOk) {
            body.put(
                    "warning",
                    "数据库未连接，请启动 MySQL 并执行 src/main/resources/sql/schema.sql"
            );
        }
        if (props.isDisabledMode()) {
            body.put("paymentDisabled", true);
        }
        return body;
    }

    public Map<String, Object> unlockStatus(String reportId) {
        if (props.isDisabledMode()) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("unlocked", true);
            body.put("reportId", reportId);
            body.put("hasReport", repo.findReportById(reportId).isPresent());
            return body;
        }
        Optional<UnlockRecord> unlock = repo.findUnlockByReportId(reportId);
        if (unlock.isEmpty()) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("unlocked", false);
            body.put("reportId", reportId);
            body.put("hasReport", repo.findReportById(reportId).isPresent());
            return body;
        }
        UnlockRecord u = unlock.get();
        Optional<OrderRecord> paidOrder = repo.findOrderById(u.orderId());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("unlocked", true);
        body.put("reportId", reportId);
        body.put("orderId", u.orderId());
        body.put("paidAt", u.paidAt());
        paidOrder.ifPresent(o -> {
            body.put("tradeNo", o.tradeNo());
            body.put("payerContact", o.payerContact());
        });
        return body;
    }

    private final EmailService emailService;
    private final MetaCapiService metaCapi;
    private final com.qacollector.service.SettingsService settingsService;

    public void saveReport(String reportId, SaveReportRequest req) {
        String chartJson = null;
        if (req.chartJson() != null) {
            try {
                chartJson = objectMapper.writeValueAsString(req.chartJson());
            } catch (JsonProcessingException e) {
                throw new IllegalArgumentException("chartJson 格式无效");
            }
        }
        repo.upsertReport(reportId, req.reportText(), chartJson, req.displayName());

        // Send email if there's a paid order with a payer contact
        List<OrderRecord> orders = repo.findOrdersByReportId(reportId);
        for (OrderRecord order : orders) {
            if (order.status() == OrderStatus.paid && order.payerContact() != null && !order.payerContact().isBlank()) {
                try {
                    emailService.sendReport(order.payerContact(), reportId, req.reportText(), req.displayName());
                } catch (Exception e) {
                    // Log but don't fail the request
                }
                break;
            }
        }
    }

    public Optional<Map<String, Object>> getReport(String reportId) {
        Optional<ReportRecord> report = repo.findReportById(reportId);
        if (report.isEmpty()) {
            return Optional.empty();
        }
        ReportRecord r = report.get();
        Optional<UnlockRecord> unlock = repo.findUnlockByReportId(reportId);
        List<OrderRecord> orders = repo.findOrdersByReportId(reportId);
        List<Map<String, Object>> orderPayloads = orders.stream().map(this::orderPayload).toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("reportId", reportId);
        body.put("hasReport", true);
        body.put("displayName", r.displayName());

        if (unlock.isEmpty() && !props.isDisabledMode()) {
            body.put("unlocked", false);
            body.put("updatedAt", r.updatedAt());
            body.put("orders", orderPayloads);
            return Optional.of(body);
        }

        body.put("unlocked", true);
        body.put("reportText", r.reportText());
        body.put("chartJson", parseChartJson(r.chartJson()));
        if (unlock.isPresent()) {
            body.put("orderId", unlock.get().orderId());
            body.put("paidAt", unlock.get().paidAt());
        }
        body.put("orders", orderPayloads);
        body.put(
                "paidOrders",
                orders.stream().filter(o -> o.status() == OrderStatus.paid).map(this::orderPayload).toList()
        );
        return Optional.of(body);
    }

    public Map<String, Object> reportOrders(String reportId) {
        Optional<UnlockRecord> unlock = repo.findUnlockByReportId(reportId);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("reportId", reportId);
        body.put("unlocked", unlock.isPresent() || props.isDisabledMode());
        unlock.ifPresent(u -> body.put("orderId", u.orderId()));
        body.put(
                "orders",
                repo.findOrdersByReportId(reportId).stream().map(this::orderPayload).toList()
        );
        return body;
    }

    public Map<String, Object> createOrder(CreateOrderRequest req, String userAgent) {
        String reportId = req.reportId().trim();
        if (props.isDisabledMode()) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("alreadyUnlocked", true);
            body.put("reportId", reportId);
            body.put("paymentMode", "disabled");
            return body;
        }
        Optional<UnlockRecord> existing = repo.findUnlockByReportId(reportId);
        if (existing.isPresent()) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("alreadyUnlocked", true);
            body.put("reportId", reportId);
            body.put("orderId", existing.get().orderId());
            return body;
        }

        int amountCents = (int) (Double.parseDouble(settingsService.getReportPrice()) * 100);

        String orderId = PaymentRepository.newOrderId();
        String channel = props.isPaypalMode() ? "paypal" : "mock";
        OrderRecord order = new OrderRecord(
                orderId,
                reportId,
                amountCents,
                props.getProductTitle(),
                channel,
                OrderStatus.pending,
                null,
                blankToNull(req.payerContact()),
                System.currentTimeMillis(),
                null
        );
        repo.upsertOrder(order);

        if (props.isMockMode()) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("orderId", orderId);
            body.put("reportId", reportId);
            body.put("amount", order.amount());
            body.put("amountYuan", String.format("%.2f", order.amount() / 100.0));
            body.put("title", order.title());
            body.put("channel", "mock");
            body.put("paymentMode", "mock");
            return body;
        }

        String returnUrl = PaymentReturnUrls.finalReport(props, orderId, reportId, true);
        String cancelUrl = PaymentReturnUrls.finalReport(props, orderId, reportId, false);
        Map<String, Object> paypalOrder = paypal.createOrder(orderId, props.getOrderAmount(), props.getProductTitle(), returnUrl, cancelUrl);
        String paypalOrderId = (String) paypalOrder.get("id");
        String approvalUrl = paypal.extractApprovalUrl(paypalOrder);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("orderId", orderId);
        body.put("reportId", reportId);
        body.put("amount", order.amount());
        body.put("amountYuan", String.format("%.2f", order.amount() / 100.0));
        body.put("title", order.title());
        body.put("channel", "paypal");
        body.put("paymentMode", "paypal");
        body.put("paypalOrderId", paypalOrderId);
        body.put("payUrl", approvalUrl);
        return body;
    }

    public Map<String, Object> capturePayPalOrder(String orderId, String paypalOrderId) {
        Map<String, Object> captureResult = paypal.captureOrder(paypalOrderId);
        String status = (String) captureResult.get("status");
        if (!"COMPLETED".equals(status)) {
            throw new IllegalStateException("PayPal capture status: " + status);
        }
        List<Map<String, Object>> purchaseUnits = (List<Map<String, Object>>) captureResult.get("purchase_units");
        String tradeNo = null;
        if (purchaseUnits != null && !purchaseUnits.isEmpty()) {
            Map<String, Object> unit = purchaseUnits.get(0);
            List<Map<String, Object>> captures = (List<Map<String, Object>>) unit.get("captures");
            if (captures != null && !captures.isEmpty()) {
                tradeNo = (String) captures.get(0).get("id");
            }
        }
        if (tradeNo == null) {
            tradeNo = "PP_" + paypalOrderId;
        }
        Optional<OrderRecord> order = repo.markOrderPaid(orderId, tradeNo);
        if (order.isEmpty()) {
            throw new IllegalArgumentException("订单不存在: " + orderId);
        }
        OrderRecord o = order.get();
        metaCapi.sendPurchase(o, null, null, null, null);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", true);
        body.put("orderId", o.id());
        body.put("reportId", o.reportId());
        body.put("status", "paid");
        body.put("unlocked", true);
        return body;
    }

    public Optional<Map<String, Object>> orderStatus(String orderId) {
        Optional<OrderRecord> order = repo.findOrderById(orderId);
        if (order.isEmpty()) {
            return Optional.empty();
        }
        OrderRecord o = order.get();
        boolean isPendingReport = "__pending__".equals(o.reportId());
        boolean unlocked = !isPendingReport
            && (repo.findUnlockByReportId(o.reportId()).isPresent() || o.status() == OrderStatus.paid);
        Map<String, Object> body = orderPayload(o);
        body.put("unlocked", unlocked);
        body.put("prepaid", o.status() == OrderStatus.paid && "partner".equals(o.channel()));
        body.put("reportPending", isPendingReport);
        return Optional.of(body);
    }

    public Optional<OrderRecord> mockPay(String orderId) {
        Optional<OrderRecord> result = repo.markOrderPaid(orderId, "MOCK_" + System.currentTimeMillis());
        result.ifPresent(o -> metaCapi.sendPurchase(o, null, null, null, null));
        return result;
    }

    public Map<String, Object> orderPayload(OrderRecord order) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("orderId", order.id());
        m.put("reportId", order.reportId());
        m.put("status", order.status().name());
        m.put("amount", order.amount());
        m.put("amountYuan", String.format("%.2f", order.amount() / 100.0));
        m.put("title", order.title());
        m.put("tradeNo", order.tradeNo());
        m.put("payerContact", order.payerContact());
        m.put("createdAt", order.createdAt());
        m.put("paidAt", order.paidAt());
        return m;
    }

    private JsonNode parseChartJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(raw);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}

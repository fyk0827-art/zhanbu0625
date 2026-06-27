package com.lifeblueprint.web;

import com.lifeblueprint.config.PaymentProperties;
import com.lifeblueprint.domain.OrderRecord;
import com.lifeblueprint.service.EmailService;
import com.lifeblueprint.service.PaymentService;
import com.lifeblueprint.web.dto.CreateOrderRequest;
import com.lifeblueprint.web.dto.SaveReportRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PaymentApiController {

    private final PaymentService paymentService;
    private final PaymentProperties props;
    private final EmailService emailService;

    public PaymentApiController(PaymentService paymentService, PaymentProperties props, EmailService emailService) {
        this.paymentService = paymentService;
        this.props = props;
        this.emailService = emailService;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return paymentService.health();
    }

    @GetMapping("/unlock/{reportId}")
    public Map<String, Object> unlockStatus(@PathVariable String reportId) {
        return paymentService.unlockStatus(reportId);
    }

    @PutMapping("/reports/{reportId}")
    public Map<String, Object> saveReport(
            @PathVariable String reportId,
            @RequestBody SaveReportRequest req
    ) {
        paymentService.saveReport(reportId, req);
        return Map.of("ok", true, "reportId", reportId);
    }

    @GetMapping("/reports/{reportId}")
    public ResponseEntity<Map<String, Object>> getReport(@PathVariable String reportId) {
        return paymentService.getReport(reportId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/reports/{reportId}/orders")
    public Map<String, Object> reportOrders(@PathVariable String reportId) {
        return paymentService.reportOrders(reportId);
    }

    @PostMapping("/orders")
    public Map<String, Object> createOrder(
            @RequestBody(required = false) CreateOrderRequest req,
            @RequestHeader("User-Agent") String userAgent
    ) {
        if (req == null || req.reportId() == null || req.reportId().isBlank()) {
            throw new IllegalArgumentException("reportId is required");
        }
        return paymentService.createOrder(req, userAgent);
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<Map<String, Object>> orderStatus(@PathVariable String orderId) {
        return paymentService.orderStatus(orderId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/paypal/capture")
    public Map<String, Object> capturePayPalOrder(@RequestBody Map<String, String> body) {
        String orderId = body.get("orderId");
        String paypalOrderId = body.get("paypalOrderId");
        if (orderId == null || paypalOrderId == null) {
            throw new IllegalArgumentException("orderId and paypalOrderId are required");
        }
        return paymentService.capturePayPalOrder(orderId, paypalOrderId);
    }

    @PostMapping("/notify/alipay")
    public Map<String, Object> alipayNotify(
            jakarta.servlet.http.HttpServletRequest request,
            @RequestBody(required = false) Map<String, String> jsonBody
    ) {
        return Map.of("ok", true, "message", "alipay notify endpoint deprecated, use paypal instead");
    }

    @PostMapping("/test-email")
    public Map<String, Object> testEmail(@RequestBody Map<String, String> body) {
        String to = body.get("to");
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("email is required");
        }
        emailService.sendTestEmail(to);
        return Map.of("ok", true, "message", "Test email sent to " + to);
    }
}

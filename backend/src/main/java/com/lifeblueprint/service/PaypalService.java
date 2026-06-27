package com.lifeblueprint.service;

import com.lifeblueprint.config.PaymentProperties;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PaypalService {

    private final PaymentProperties props;
    private final RestTemplate restTemplate;

    public PaypalService(PaymentProperties props) {
        this.props = props;
        this.restTemplate = new RestTemplate();
    }

    private String getBaseUrl() {
        String mode = props.getPaypal().getMode();
        return "sandbox".equalsIgnoreCase(mode)
            ? "https://api-m.sandbox.paypal.com"
            : "https://api-m.paypal.com";
    }

    public String getClientId() {
        return props.getPaypal().getClientId();
    }

    private String getAccessToken() {
        String baseUrl = getBaseUrl();
        String auth = props.getPaypal().getClientId() + ":" + props.getPaypal().getSecret();
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.set("Authorization", "Basic " + encodedAuth);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
            baseUrl + "/v1/oauth2/token",
            request,
            Map.class
        );

        return (String) response.getBody().get("access_token");
    }

    public Map<String, Object> createOrder(String orderId, int amountCents, String title, String returnUrl, String cancelUrl) {
        String token = getAccessToken();
        String baseUrl = getBaseUrl();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        headers.set("Prefer", "return=representation");

        double amountDollars = amountCents / 100.0;

        Map<String, Object> purchaseUnit = new LinkedHashMap<>();
        purchaseUnit.put("reference_id", orderId);
        purchaseUnit.put("description", title);
        purchaseUnit.put("amount", Map.of(
            "currency_code", "USD",
            "value", String.format("%.2f", amountDollars)
        ));

        Map<String, Object> orderRequest = new LinkedHashMap<>();
        orderRequest.put("intent", "CAPTURE");
        orderRequest.put("purchase_units", List.of(purchaseUnit));
        orderRequest.put("application_context", Map.of(
            "brand_name", "Life Blueprint",
            "landing_page", "LOGIN",
            "user_action", "PAY_NOW",
            "return_url", returnUrl,
            "cancel_url", cancelUrl
        ));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(orderRequest, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
            baseUrl + "/v2/checkout/orders",
            request,
            Map.class
        );

        return response.getBody();
    }

    public String extractApprovalUrl(Map<String, Object> paypalResponse) {
        List<Map<String, String>> links = (List<Map<String, String>>) paypalResponse.get("links");
        if (links != null) {
            for (Map<String, String> link : links) {
                if ("approve".equals(link.get("rel")) || "payer-action".equals(link.get("rel"))) {
                    return link.get("href");
                }
            }
        }
        return null;
    }

    public Map<String, Object> captureOrder(String paypalOrderId) {
        String token = getAccessToken();
        String baseUrl = getBaseUrl();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        headers.set("Prefer", "return=representation");

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(
            baseUrl + "/v2/checkout/orders/" + paypalOrderId + "/capture",
            request,
            Map.class
        );

        return response.getBody();
    }

    public Map<String, Object> getOrder(String paypalOrderId) {
        String token = getAccessToken();
        String baseUrl = getBaseUrl();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(
            baseUrl + "/v2/checkout/orders/" + paypalOrderId,
            HttpMethod.GET,
            request,
            Map.class
        );

        return response.getBody();
    }
}

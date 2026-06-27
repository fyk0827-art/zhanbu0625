package com.lifeblueprint.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "payment")
public class PaymentProperties {

    private String mode = "mock";
    private int orderAmount = 2990;
    private String productTitle = "人生蓝图·完整行动版";
    private String frontendUrl = "http://localhost:3033";
    private String baseUrl = "http://localhost:8883";
    private Paypal paypal = new Paypal();

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public int getOrderAmount() {
        return orderAmount;
    }

    public void setOrderAmount(int orderAmount) {
        this.orderAmount = orderAmount;
    }

    public String getProductTitle() {
        return productTitle;
    }

    public void setProductTitle(String productTitle) {
        this.productTitle = productTitle;
    }

    public String getFrontendUrl() {
        return stripTrailingSlash(frontendUrl);
    }

    public void setFrontendUrl(String frontendUrl) {
        this.frontendUrl = frontendUrl;
    }

    public String getBaseUrl() {
        return stripTrailingSlash(baseUrl);
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public Paypal getPaypal() {
        return paypal;
    }

    public void setPaypal(Paypal paypal) {
        this.paypal = paypal;
    }

    public boolean isDisabledMode() {
        return mode != null && "disabled".equalsIgnoreCase(mode);
    }

    public boolean isMockMode() {
        if (isDisabledMode()) {
            return false;
        }
        if (mode == null || mode.isBlank()) {
            return true;
        }
        return "mock".equalsIgnoreCase(mode);
    }

    public boolean isPaypalMode() {
        return "paypal".equalsIgnoreCase(mode);
    }

    private static String stripTrailingSlash(String url) {
        if (url == null || url.isEmpty()) {
            return url;
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    public static class Paypal {
        private String clientId = "";
        private String secret = "";
        private String mode = "sandbox";

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getSecret() {
            return secret;
        }

        public void setSecret(String secret) {
            this.secret = secret;
        }

        public String getMode() {
            return mode;
        }

        public void setMode(String mode) {
            this.mode = mode;
        }

        public boolean isConfigured() {
            return clientId != null && !clientId.isBlank()
                    && secret != null && !secret.isBlank();
        }
    }
}

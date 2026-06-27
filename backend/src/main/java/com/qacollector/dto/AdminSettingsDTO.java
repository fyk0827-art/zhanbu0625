package com.qacollector.dto;

import lombok.Data;

@Data
public class AdminSettingsDTO {
    private int quizQuestionCount;
    private String paymentMode;
    private String reportPrice;
}

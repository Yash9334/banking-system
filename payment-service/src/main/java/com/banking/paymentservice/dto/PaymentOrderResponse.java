package com.banking.paymentservice.dto;

import java.math.BigDecimal;

public class PaymentOrderResponse {

    private String paymentId;
    private String razorpayOrderId;
    private BigDecimal amount;
    private String currency;
    private String razorpaykeyId;
    private String status;
}



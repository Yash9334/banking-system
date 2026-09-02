package com.banking.paymentservice.service;

import com.banking.paymentservice.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

    private static final String PAYMENT_COMPLETED_TOPIC = "payment.completed";
    private static final String PAYMENT_FAILED_TOPIC = "payment.failed";

    /**
     * Create Razorpay payment order
     *
     * FLOW:
     *  1. create order in razorpay
     *  2. save Payment record in DB
     *  3. return order details to frontend
     *  4. frontend show razorpay checkout
     *  5. user pays
     *  6. razorpay calls the webhook
     */


}

package com.banking.paymentservice.service;

import com.banking.paymentservice.dto.CreatePaymentRequest;
import com.banking.paymentservice.dto.PaymentOrderResponse;
import com.banking.paymentservice.entity.Payment;
import com.banking.paymentservice.entity.PaymentStatus;
import com.banking.paymentservice.repository.PaymentRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

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

    public PaymentOrderResponse createPaymentOrder(CreatePaymentRequest request) throws RazorpayException {

        log.info("Creating payment order for account: {} amount: {}",request.getAccountNumber(),request.getAmount());
        RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);

        //Amount in paise(1 INR = 100 paise)
        int amountInPaise = request.getAmount().multiply(BigDecimal.valueOf(100)).intValue();

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount",amountInPaise);
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", "rcpt_" + UUID.randomUUID().toString().replace("-","").substring(0,30));

        Order razorPayOrder = razorpay.orders.create(orderRequest);
        log.info("Razorpay order created: {}",razorPayOrder.get("id").toString());

        // save payment record
        Payment payment = new Payment();
        payment.setRazorpayOrderId(razorPayOrder.get("id").toString());
        payment.setAccountNumber(request.getAccountNumber());
        payment.setAmount(request.getAmount());
        payment.setCurrency("INR");
        payment.setStatus(PaymentStatus.CREATED);
        payment.setDescription(request.getDescription());

        Payment saved = paymentRepository.save(payment);

        return new PaymentOrderResponse(
                saved.getId(),
                razorPayOrder.get("id").toString(),
                request.getAmount(),
                "INR",
                keyId,
                "CREATED"
        );
    }
}

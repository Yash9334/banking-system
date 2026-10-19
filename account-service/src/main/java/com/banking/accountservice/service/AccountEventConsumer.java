package com.banking.accountservice.service;

import com.banking.accountservice.service.AccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AccountEventConsumer {

    private final AccountService accountService;
    private final ObjectMapper objectMapper;


    @KafkaListener(
            topics = "fraud.detected",
            groupId = "account-service-group"
    )
    public void consumeFraudDetected(String message) {
        try {
            Map<String, Object> payload = objectMapper.readValue(
                    message,
                    new TypeReference<Map<String, Object>>() {}
            );

            String accountNumber =
                    payload.get("accountNumber").toString();

            log.info("Fraud detected. Blocking account: {}", accountNumber);
            accountService.blockAccount(accountNumber);

        } catch (Exception e) {
            log.error("Error processing fraud.detected event", e);
            throw new RuntimeException("Failed to process fraud event", e);
        }
    }
}
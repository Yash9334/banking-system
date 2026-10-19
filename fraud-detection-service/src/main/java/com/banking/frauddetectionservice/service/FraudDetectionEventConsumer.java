package com.banking.frauddetectionservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class FraudDetectionEventConsumer {

    private final FraudDetectionService fraudDetectionService;
    private final ObjectMapper objectMapper;

    /**
     * Listens to transaction.Initiated topic.
     * Every transaction goes through fraud check be fore completing.
     */

    @KafkaListener(topics="transaction.initiated",groupId = "fraud-detection-group")

    public void consumeTransactionInitiated(String message){

        log.info("RAW KAFKA EVENT RECEIVED: {}", message);

        try {
            Map<String, Object> payload = objectMapper.readValue(
                    message,
                    new TypeReference<Map<String, Object>>() {}
            );

            log.info(
                    "Received transaction for fraud check: {}",
                    payload.get("transactionId")
            );

            fraudDetectionService.checkTransaction(payload);

        } catch (Exception e) {
            log.error("Error processing transaction event", e);
        }

    }
}

package com.banking.paymentservice.repository;

import com.banking.paymentservice.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment,String> {

    Optional<Payment> findByRazorpayOrderId(String orderId);
}

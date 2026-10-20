# Backend findings (not applied — your code is untouched)

Found while reading the repository. The frontend shows the real backend result, so these surface in the UI.

## 1. Correct OTP never completes the transfer (important)
`TransactionService.verifyOTP()` calls `completeTransaction(transaction)`, but `completeTransaction()` returns early unless status is `PROCESSING`. At OTP time the status is `PENDING_VERIFICATION`, so the receiver is never credited and the status stays `PENDING_VERIFICATION`. The OTP is already deleted, so a second verify call finds no OTP and **refunds the sender**.
Fix (either one):
```java
// in verifyOTP(), before completeTransaction(transaction):
transaction.setStatus(TransactionStatus.PROCESSING);
```
or let `completeTransaction` accept `PROCESSING` **or** `PENDING_VERIFICATION`.

## 2. verifyOTP does not check the current status
Calling `POST /{id}/verify` on a COMPLETED/FLAGGED transaction finds no OTP and runs `compensateTransaction` (refund + FLAGGED). Add at the top of `verifyOTP`: reject unless `status == PENDING_VERIFICATION`. (The UI re-reads the status before submitting to avoid this.)

## 3. Notification handlers missing @KafkaListener
`consumeTransactionCompleted` (topic `transaction.completed`) and `consumeFraudDetected` (topic `fraud.detected`) have no `@KafkaListener`, so debit/credit and account-blocked alerts are never produced.

## 4. Errors come back as bare HTTP 500 with no message
No `@RestControllerAdvice` exists: unknown account, insufficient balance, duplicate e-mail and Feign failures all return 500 without a message; validation errors return 400 without field messages. The UI works around this with pre-flight GET checks. A `@RestControllerAdvice` returning `{message}` (404/409/400) would give users real messages.

## 5. Receiver is never validated before debit
If the receiver account does not exist, the sender is debited, then the credit fails inside the Kafka consumer (exception swallowed) and the transaction stays PROCESSING with no compensation. The UI checks the receiver exists first.

## 6. Smaller items
- CORS: none configured anywhere (`/app/**` mapping in payment-service matches no route). The Vite proxy avoids it. For a deployed frontend add CORS at the gateway (`spring.cloud.gateway.server.webflux.globalcors`).
- Payment Service has no GET endpoint, so payment status can't be shown; the webhook does no signature verification and treats every non-`payment.captured` event as FAILED. `payment.completed` does not credit any account.
- Transaction history lists only transactions *sent* by an account.
- The balance-share fraud rule reads the balance after the sender was already debited.
- DB password and Razorpay secrets are in application.yaml; keep them out of Git.

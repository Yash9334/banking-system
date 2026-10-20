import { http } from './axios'

// Transaction Service - TransactionController (/api/v1/transactions)

/** Statuses defined by the backend TransactionStatus enum. */
export const TX_STATUSES = ['PENDING', 'PROCESSING', 'PENDING_VERIFICATION', 'COMPLETED', 'FAILED', 'FLAGGED']

/** Polling can stop for these: the Saga has nothing more to do on its own. */
export const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'FLAGGED']

/** POST /api/v1/transactions/transfer  body: TransferRequest -> 201 TransactionResponse */
export const transfer = (payload) => http.post('/api/v1/transactions/transfer', payload).then((r) => r.data)

/** GET /api/v1/transactions/{transactionId} */
export const getTransaction = (transactionId) =>
  http.get(`/api/v1/transactions/${encodeURIComponent(transactionId)}`).then((r) => r.data)

/** GET /api/v1/transactions/account/{accountNumber}  (backend returns SENT transactions only) */
export const getHistory = (accountNumber) =>
  http.get(`/api/v1/transactions/account/${encodeURIComponent(accountNumber)}`).then((r) => r.data)

/** POST /api/v1/transactions/{transactionId}/verify?otp=...  (otp is a @RequestParam in the backend) */
export const verifyOtp = (transactionId, otp) =>
  http.post(`/api/v1/transactions/${encodeURIComponent(transactionId)}/verify`, null, { params: { otp } }).then((r) => r.data)

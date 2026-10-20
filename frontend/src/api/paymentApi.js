import { http } from './axios'

// Payment Service - PaymentController (/api/v1/payments)
// There is NO "get payment" endpoint in the backend, so a payment's live status cannot be read.
// POST /webhook exists for Razorpay -> backend only and is deliberately not called by the UI.

/**
 * POST /api/v1/payments/create-order  body: CreatePaymentRequest -> 201 PaymentOrderResponse
 *
 * The backend DTO names the key field `razorpaykeyId` (lower-case k). Some docs show `razorpayKeyId`.
 * We normalise both so the UI works either way.
 */
export async function createOrder(payload) {
  const { data } = await http.post('/api/v1/payments/create-order', payload)
  return { ...data, razorpayKeyId: data.razorpayKeyId ?? data.razorpaykeyId }
}

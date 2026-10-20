import axios from 'axios'

// Centralised Axios instance. All pages go through the API modules, never raw axios.
const baseURL = import.meta.env.VITE_API_BASE_URL || ''
const timeout = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || 15000

export const http = axios.create({
  baseURL,
  timeout,
  headers: { 'Content-Type': 'application/json' },
})

const SERVICE_BY_PATH = [
  ['/api/v1/accounts', 'Account Service'],
  ['/api/v1/transactions', 'Transaction Service'],
  ['/api/v1/payments', 'Payment Service'],
  ['/_health/gateway', 'API Gateway'],
  ['/_health/account', 'Account Service'],
  ['/_health/transaction', 'Transaction Service'],
  ['/_health/payment', 'Payment Service'],
  ['/_health/fraud', 'Fraud Detection Service'],
  ['/_health/notification', 'Notification Service'],
]

export function serviceNameFor(url = '') {
  const hit = SERVICE_BY_PATH.find(([prefix]) => url.includes(prefix))
  return hit ? hit[1] : 'Backend'
}

/** Normalised error thrown by every API call. Pages only ever see this shape. */
export class ApiError extends Error {
  constructor({ message, status = null, kind = 'unknown', service = 'Backend', details = null }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.kind = kind // network | timeout | unreachable | rate-limit | validation | not-found | server | unknown
    this.service = service
    this.details = details
  }
}

function pickBackendMessage(data) {
  if (!data) return ''
  if (typeof data === 'string') return data.length < 200 ? data : ''
  if (typeof data.message === 'string' && data.message.trim()) return data.message
  if (Array.isArray(data.errors) && data.errors.length) {
    return data.errors.map((e) => e.defaultMessage || e.message || String(e)).join('; ')
  }
  return ''
}

export function toApiError(err) {
  if (err instanceof ApiError) return err
  const url = err?.config?.url || ''
  const service = serviceNameFor(url)

  if (!err?.response) {
    if (err?.code === 'ECONNABORTED') {
      return new ApiError({
        kind: 'timeout',
        service,
        message: `${service} did not respond within ${Math.round(timeout / 1000)}s. It may be overloaded or stuck.`,
      })
    }
    return new ApiError({
      kind: 'network',
      service,
      message: `Could not reach the frontend dev server / API (${service}). Is "npm run dev" still running?`,
    })
  }

  const { status, data } = err.response
  const backendMessage = pickBackendMessage(data)

  // Our Vite proxy answers 503 + {proxyError:true} when the upstream refuses the connection.
  if (status === 503 && data?.proxyError) {
    return new ApiError({
      kind: 'unreachable',
      status,
      service,
      message: `${service} is not reachable (${data.target}). Start it and try again.`,
    })
  }
  if (status === 502 || status === 503 || status === 504) {
    return new ApiError({
      kind: 'unreachable',
      status,
      service,
      message: `The API Gateway could not get an answer from ${service} (HTTP ${status}). The service is probably down.`,
    })
  }
  if (status === 429) {
    return new ApiError({
      kind: 'rate-limit',
      status,
      service,
      message: 'API Gateway rate limit reached. Wait a few seconds and try again.',
    })
  }
  if (status === 400) {
    return new ApiError({
      kind: 'validation',
      status,
      service,
      message: backendMessage || `${service} rejected the request (HTTP 400). Check the values you entered.`,
      details: data,
    })
  }
  if (status === 404) {
    return new ApiError({
      kind: 'not-found',
      status,
      service,
      message: backendMessage || `Resource not found in ${service} (HTTP 404).`,
    })
  }
  return new ApiError({
    kind: 'server',
    status,
    service,
    message:
      backendMessage ||
      `${service} returned HTTP ${status}. The backend does not send error details - check that service's console for the reason.`,
    details: data,
  })
}

http.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(toApiError(err))
)

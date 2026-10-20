import { http, toApiError } from './axios'

/**
 * Health uses Spring Boot Actuator (/actuator/health), which every service exposes.
 * The browser calls /_health/<key>; the Vite dev proxy forwards it to <service>/actuator/health.
 */
export const REST_SERVICES = [
  { key: 'gateway', name: 'API Gateway', port: 8080 },
  { key: 'account', name: 'Account Service', port: 8081 },
  { key: 'transaction', name: 'Transaction Service', port: 8082 },
  { key: 'payment', name: 'Payment Service', port: 8083 },
  { key: 'fraud', name: 'Fraud Detection Service', port: 8084 },
  { key: 'notification', name: 'Notification Service', port: 8085 },
]

export const INFRA = [
  { key: 'kafka', name: 'Kafka', port: 9092 },
  { key: 'redis', name: 'Redis', port: 6379 },
  { key: 'mysql', name: 'MySQL', port: 3306 },
]

/** -> { status: 'UP' | 'DOWN' | 'UNREACHABLE' | 'UNKNOWN', detail } */
export async function checkService(key) {
  try {
    const res = await http.get(`/_health/${key}`, { timeout: 4000, validateStatus: () => true })
    if (res.status === 503 && res.data?.proxyError) {
      return { status: 'UNREACHABLE', detail: res.data.message }
    }
    if (res.data?.status === 'UP') return { status: 'UP' }
    if (res.data?.status === 'DOWN') return { status: 'DOWN', detail: 'Actuator reports DOWN (a dependency such as Redis or MySQL may be down)' }
    return { status: 'UNKNOWN', detail: `HTTP ${res.status}` }
  } catch (err) {
    return { status: 'UNREACHABLE', detail: toApiError(err).message }
  }
}

/** TCP probe done by the Vite dev server -> { status: 'REACHABLE' | 'UNREACHABLE' | 'NOT_AVAILABLE' } */
export async function probeInfra(key) {
  try {
    const res = await http.get(`/__probe/${key}`, { timeout: 4000, validateStatus: () => true })
    if (res.status === 200 && typeof res.data?.reachable === 'boolean') {
      return { status: res.data.reachable ? 'REACHABLE' : 'UNREACHABLE', detail: res.data.target }
    }
    return { status: 'NOT_AVAILABLE', detail: 'Probe only exists in the Vite dev/preview server' }
  } catch {
    return { status: 'NOT_AVAILABLE', detail: 'Probe unavailable' }
  }
}

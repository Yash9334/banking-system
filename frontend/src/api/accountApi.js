import { http, ApiError } from './axios'

// Account Service - AccountController (/api/v1/accounts)
// NOTE: /deduct and /credit exist but are internal Saga endpoints called by the
// Transaction Service. They are intentionally NOT exposed in the UI.

export const ACCOUNT_TYPES = ['SAVINGS', 'CURRENT', 'FIXED_DEPOSIT'] // AccountType enum

/** POST /api/v1/accounts  body: CreateAccountRequest -> 201 AccountResponse */
export const createAccount = (payload) => http.post('/api/v1/accounts', payload).then((r) => r.data)

/** GET /api/v1/accounts/{accountNumber} -> AccountResponse */
export const getAccount = (accountNumber) =>
  http.get(`/api/v1/accounts/${encodeURIComponent(accountNumber)}`).then((r) => r.data)

/** GET /api/v1/accounts/{accountNumber}/balance -> number */
export const getBalance = (accountNumber) =>
  http.get(`/api/v1/accounts/${encodeURIComponent(accountNumber)}/balance`).then((r) => r.data)

/** PUT /api/v1/accounts/{accountNumber}/block -> plain text */
export const blockAccount = (accountNumber) =>
  http.put(`/api/v1/accounts/${encodeURIComponent(accountNumber)}/block`).then((r) => r.data)

/**
 * The backend throws a bare RuntimeException("Account not Found"), which Spring turns into HTTP 500
 * (not 404). So "500 from a GET" is how an unknown account number shows up. This helper makes
 * that readable without hiding real outages (unreachable/timeouts are re-thrown untouched).
 */
export async function lookupAccount(accountNumber) {
  try {
    return await getAccount(accountNumber)
  } catch (err) {
    if (err instanceof ApiError && (err.kind === 'server' || err.kind === 'not-found')) {
      throw new ApiError({
        kind: 'not-found',
        status: err.status,
        service: err.service,
        message: `Account ${accountNumber} was not found (Account Service answered HTTP ${err.status}).`,
      })
    }
    throw err
  }
}

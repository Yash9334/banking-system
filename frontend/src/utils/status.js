// Colour semantics: green = success, red = failure, amber = fraud/verification warning, blue = in progress.
export const STATUS_STYLES = {
  // Transaction (TransactionStatus enum)
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  FAILED: 'bg-red-50 text-red-700 ring-red-600/20',
  FLAGGED: 'bg-red-50 text-red-700 ring-red-600/20',
  PENDING_VERIFICATION: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  PROCESSING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  PENDING: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  // Account (AccountStatus enum)
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  BLOCKED: 'bg-red-50 text-red-700 ring-red-600/20',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  // Payment (PaymentStatus enum)
  CREATED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  REFUNDED: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  // Service health
  UP: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REACHABLE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  DOWN: 'bg-red-50 text-red-700 ring-red-600/20',
  UNREACHABLE: 'bg-red-50 text-red-700 ring-red-600/20',
  UNKNOWN: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  NOT_AVAILABLE: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

/** The backend marks a refunded Saga as FLAGGED + failureReason mentioning the refund. */
export function wasRefunded(tx) {
  return tx?.status === 'FLAGGED' && /refund/i.test(tx.failureReason || '')
}

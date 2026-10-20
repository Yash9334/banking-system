const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

export function formatMoney(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—'
  return inr.format(Number(value))
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function timeAgo(value) {
  if (!value) return '—'
  const secs = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export function shortId(id) {
  return id ? `${String(id).slice(0, 8)}…` : '—'
}

export const ACCOUNT_NUMBER_RE = /^\d{12}$/ // AccountService.generateAccountNumber() creates 12 digits

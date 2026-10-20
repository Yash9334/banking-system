import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Loader2, Search, Send, ShieldAlert } from 'lucide-react'
import { transfer, getHistory } from '../api/transactionApi'
import { lookupAccount } from '../api/accountApi'
import { ApiError } from '../api/axios'
import ConfirmDialog from '../components/ConfirmDialog'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import Notice from '../components/Notice'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import TransactionTable from '../components/TransactionTable'
import CopyButton from '../components/CopyButton'
import { useToast } from '../components/ToastProvider'
import useTransactionTracker from '../hooks/useTransactionTracker'
import { accountsStore, logActivity, useStore } from '../utils/store'
import { ACCOUNT_NUMBER_RE, formatDate, formatMoney } from '../utils/format'
import { wasRefunded } from '../utils/status'
import { useRef } from 'react'

const EMPTY = { senderAccountNumber: '', receiverAccountNumber: '', amount: '', description: '' }

function validate(f) {
  const e = {}
  if (!ACCOUNT_NUMBER_RE.test(f.senderAccountNumber.trim())) e.senderAccountNumber = 'Sender account number must be 12 digits'
  if (!ACCOUNT_NUMBER_RE.test(f.receiverAccountNumber.trim())) e.receiverAccountNumber = 'Receiver account number must be 12 digits'
  if (!e.senderAccountNumber && f.senderAccountNumber.trim() === f.receiverAccountNumber.trim()) e.receiverAccountNumber = 'Receiver must differ from sender'
  if (f.amount === '' || Number(f.amount) <= 0) e.amount = 'Amount must be positive'
  return e
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

/** Live card for the transfer that was just submitted. */
function TransferResult({ initial }) {
  const { tx, error, polling, timedOut } = useTransactionTracker(initial)
  const t = tx || initial
  return (
    <div className="card card-pad space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-ink">Transfer submitted</h3>
        <span className="flex items-center gap-2">
          {polling && <span className="flex items-center gap-1.5 text-xs text-ink-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> checking status…</span>}
          <StatusBadge status={t.status} label={wasRefunded(t) ? 'FLAGGED · refunded' : undefined} />
        </span>
      </div>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div><dt className="text-xs text-ink-400">Transaction ID</dt><dd className="flex items-center gap-2 break-all font-mono text-xs">{t.id}<CopyButton value={t.id} /></dd></div>
        <div><dt className="text-xs text-ink-400">Reference</dt><dd className="break-all font-mono text-xs">{t.referenceNumber || '—'}</dd></div>
        <div><dt className="text-xs text-ink-400">From → To</dt><dd className="font-mono text-xs">{t.senderAccountNumber} → {t.receiverAccountNumber}</dd></div>
        <div><dt className="text-xs text-ink-400">Amount</dt><dd className="font-medium">{formatMoney(t.amount)}</dd></div>
        <div><dt className="text-xs text-ink-400">Created</dt><dd>{formatDate(t.createdAt)}</dd></div>
        <div><dt className="text-xs text-ink-400">Completed</dt><dd>{formatDate(t.completedAt)}</dd></div>
      </dl>

      {t.failureReason && <Notice tone="warning" title="Reason reported by backend">{t.failureReason}</Notice>}
      {t.status === 'PENDING_VERIFICATION' && (
        <Notice tone="warning" title="OTP verification required">
          Fraud detection flagged this transfer. Enter the OTP on the{' '}
          <Link to="/fraud" className="font-semibold underline">Fraud &amp; OTP page <ArrowRight className="inline h-3.5 w-3.5" /></Link>. The OTP is delivered through the Notification Service (see its console).
        </Notice>
      )}
      {t.status === 'PROCESSING' && !polling && timedOut && (
        <Notice tone="warning" title="Still PROCESSING after 90 seconds">
          Fraud-check or completion events may not have been handled. Check that Kafka and the Fraud Detection Service are running, then refresh the history below. The sender has already been debited in the Saga&apos;s first step.
        </Notice>
      )}
      {t.status === 'COMPLETED' && <p className="text-sm text-emerald-700">Backend confirms COMPLETED — receiver credited.</p>}
      {error && <ErrorMessage error={error} title="Status check failed (will retry)" />}
    </div>
  )
}

export default function Transactions() {
  const toast = useToast()
  const tracked = useStore(accountsStore)
  const submitting = useRef(false)

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted] = useState(null)

  const [query, setQuery] = useState('')
  const [history, setHistory] = useState(null)
  const [historyFor, setHistoryFor] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const openConfirm = (e) => {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    setSubmitError(null)
    if (!Object.keys(v).length) setConfirm(true)
  }

  const send = async () => {
    if (submitting.current) return // guard against double submit
    submitting.current = true
    setBusy(true)
    setSubmitError(null)
    try {
      const sender = form.senderAccountNumber.trim()
      const receiver = form.receiverAccountNumber.trim()
      const amount = Number(form.amount)

      // Pre-flight with real GET calls so failures are explained instead of a bare HTTP 500.
      const senderAcc = await lookupAccount(sender)
      if (senderAcc.status !== 'ACTIVE') throw new ApiError({ kind: 'validation', message: `Sender account is ${senderAcc.status}. Only ACTIVE accounts can send money.` })
      if (Number(senderAcc.balance) < amount) throw new ApiError({ kind: 'validation', message: `Insufficient balance: ${formatMoney(senderAcc.balance)} available, ${formatMoney(amount)} requested.` })
      await lookupAccount(receiver)

      const created = await transfer({ senderAccountNumber: sender, receiverAccountNumber: receiver, amount, description: form.description.trim() || null })
      accountsStore.add(sender)
      accountsStore.add(receiver)
      logActivity('transaction', `Transfer ${created.id.slice(0, 8)}… submitted (${created.status})`, { status: created.status, transactionId: created.id })
      setSubmitted(created)
      toast.info(`Transaction ${created.id.slice(0, 8)}… accepted with status ${created.status}.`, 'Transfer submitted')
      setForm(EMPTY)
      setConfirm(false)
    } catch (err) {
      setSubmitError(err)
      setConfirm(false)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  const loadHistory = async (number) => {
    const n = (number ?? query).trim()
    if (!ACCOUNT_NUMBER_RE.test(n)) {
      setHistoryError('Enter a 12-digit account number.')
      return
    }
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const rows = await getHistory(n)
      setHistory(rows)
      setHistoryFor(n)
      setQuery(n)
    } catch (err) {
      setHistory(null)
      setHistoryError(err)
    } finally {
      setHistoryLoading(false)
    }
  }

  return (
    <>
      <PageHeader title="Transactions" subtitle="Send money through the Saga: debit → fraud check → (OTP) → credit. Status comes from the Transaction Service, never assumed." />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card card-pad lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink"><Send className="h-4 w-4 text-brand" /> New transfer</h3>
          <form onSubmit={openConfirm} noValidate className="space-y-4">
            <Field label="Sender account number" error={errors.senderAccountNumber}>
              <input className="input font-mono" list="known-accounts" value={form.senderAccountNumber} onChange={set('senderAccountNumber')} placeholder="12 digits" inputMode="numeric" />
            </Field>
            <Field label="Receiver account number" error={errors.receiverAccountNumber}>
              <input className="input font-mono" list="known-accounts" value={form.receiverAccountNumber} onChange={set('receiverAccountNumber')} placeholder="12 digits" inputMode="numeric" />
            </Field>
            <datalist id="known-accounts">{tracked.map((n) => <option key={n} value={n} />)}</datalist>
            <Field label="Amount (₹)" error={errors.amount}>
              <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} placeholder="1000" />
            </Field>
            <Field label="Description (optional)">
              <input className="input" value={form.description} onChange={set('description')} placeholder="Rent, gift, …" maxLength={120} />
            </Field>
            <ErrorMessage error={submitError} title="Transfer was not submitted" />
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Submitting…' : 'Review & send'}</button>
          </form>
        </section>

        <section className="space-y-4 lg:col-span-3">
          {submitted ? <TransferResult key={submitted.id} initial={submitted} /> : (
            <div className="card card-pad text-ink-400">
              <p className="font-semibold text-ink">What happens after you send</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                <li>Transaction Service debits the sender via Account Service and saves the transaction as <b>PROCESSING</b>.</li>
                <li>A Kafka event asks Fraud Detection to inspect it (Redis velocity, average amount, balance share).</li>
                <li>Clean → receiver credited → <b>COMPLETED</b>. Suspicious → <b>PENDING_VERIFICATION</b> and an OTP is issued.</li>
                <li>Wrong or expired OTP → sender refunded (Saga compensation) → <b>FLAGGED</b>.</li>
              </ol>
            </div>
          )}
        </section>
      </div>

      <section className="card mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">Transaction history</h3>
            <p className="text-xs text-ink-400">The backend returns transactions <b>sent</b> from an account (newest first); received transfers are not listed.</p>
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); loadHistory() }}>
            <input className="input w-56 font-mono" list="known-accounts" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sender account number" inputMode="numeric" />
            <button className="btn-secondary" disabled={historyLoading}><Search className="h-4 w-4" /> Search</button>
          </form>
        </div>
        {historyLoading && <LoadingSpinner label="Loading history…" />}
        {historyError && !historyLoading && <div className="p-5"><ErrorMessage error={historyError} onRetry={() => loadHistory()} /></div>}
        {!historyLoading && !historyError && history === null && (
          <p className="px-5 py-10 text-center text-ink-400">Enter a sender account number to load its transactions.</p>
        )}
        {!historyLoading && history !== null && (
          <>
            <div className="flex items-center justify-between px-5 py-2.5 text-xs text-ink-400">
              <span>{history.length} transaction{history.length === 1 ? '' : 's'} sent from <span className="font-mono">{historyFor}</span></span>
              {history.some((t) => t.status === 'PENDING_VERIFICATION') && (
                <Link to="/fraud" className="flex items-center gap-1 font-semibold text-amber-700"><ShieldAlert className="h-3.5 w-3.5" /> OTP needed</Link>
              )}
            </div>
            <TransactionTable transactions={history} emptyTitle="No transactions yet" emptyText="This account has not sent any money." />
          </>
        )}
      </section>

      <ConfirmDialog open={confirm} title="Confirm transfer" confirmLabel="Send money" busy={busy} onConfirm={send} onCancel={() => setConfirm(false)}>
        You are about to send <b>{formatMoney(form.amount)}</b> from <span className="font-mono">{form.senderAccountNumber}</span> to <span className="font-mono">{form.receiverAccountNumber}</span>. The sender is debited immediately; suspicious transfers may require an OTP.
      </ConfirmDialog>
    </>
  )
}

import { useState } from 'react'
import { AlertTriangle, Bell, CheckCircle2, Gauge, KeyRound, RefreshCw, Scale, ShieldAlert, ShieldCheck, Timer } from 'lucide-react'
import { getTransaction, verifyOtp } from '../api/transactionApi'
import { lookupAccount } from '../api/accountApi'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import LoadingSpinner from '../components/LoadingSpinner'
import Notice from '../components/Notice'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import CopyButton from '../components/CopyButton'
import { useToast } from '../components/ToastProvider'
import useTrackedTransactions from '../hooks/useTrackedTransactions'
import { logActivity } from '../utils/store'
import { formatDate, formatMoney, timeAgo } from '../utils/format'
import { wasRefunded } from '../utils/status'

// Values below mirror fraud-detection-service/src/main/resources/application.yaml and FraudDetectionService.java
const RULES = [
  { icon: Gauge, title: 'Velocity (Redis)', text: 'More than 5 transfers from one account within 60 seconds (key fraud:velocity:<account>).' },
  { icon: Scale, title: 'Unusual amount', text: 'Amount above 3× the account’s running average (key fraud:avg_amount<account>). First transfer only sets the average.' },
  { icon: AlertTriangle, title: 'Balance share', text: 'Amount above 90% of the sender’s balance as read by the fraud service (after the Saga has already debited the sender).' },
]

function OtpCard({ tx, onVerified }) {
  const toast = useToast()
  const [otp, setOtp] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const validOtp = /^\d{6}$/.test(otp)

  const run = async () => {
    setBusy(true)
    setError(null)
    try {
      // Re-read the status first: the backend would REFUND a transaction that is no longer awaiting OTP.
      const current = await getTransaction(tx.id)
      if (current.status !== 'PENDING_VERIFICATION') {
        onVerified(tx.id, { tx: current, note: `Not verified: the backend now reports ${current.status}, so no OTP was submitted.` })
        toast.warning(`Transaction is already ${current.status}; OTP not submitted.`)
        return
      }
      const result = await verifyOtp(tx.id, otp)
      logActivity('fraud', `OTP submitted for ${tx.id.slice(0, 8)}… → backend returned ${result.status}`, { status: result.status, transactionId: tx.id })
      // Compensation / blocking is partly asynchronous (Kafka). Give it a moment, then read the real account state.
      let senderAfter = null
      let senderError = null
      await new Promise((r) => setTimeout(r, 2000))
      try {
        senderAfter = await lookupAccount(tx.senderAccountNumber)
      } catch (e) {
        senderError = e
      }
      onVerified(tx.id, { tx: result, senderAfter, senderError })
      setOtp('')
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-semibold text-amber-900"><ShieldAlert className="h-4 w-4" /> Verification required</p>
          <p className="mt-1 flex items-center gap-2 break-all font-mono text-xs text-ink-500">{tx.id}<CopyButton value={tx.id} /></p>
          <p className="mt-1 text-ink-500">
            <b>{formatMoney(tx.amount)}</b> · <span className="font-mono text-xs">{tx.senderAccountNumber} → {tx.receiverAccountNumber}</span>
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400"><Timer className="h-3.5 w-3.5" /> created {timeAgo(tx.createdAt)} · OTP lifetime is 5 minutes in the backend</p>
        </div>
        <StatusBadge status={tx.status} />
      </div>

      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); if (validOtp) setConfirm(true) }}>
        <div>
          <label className="label">6-digit OTP</label>
          <input className="input w-40 text-center font-mono tracking-[0.3em]" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" />
        </div>
        <button className="btn-warn" disabled={!validOtp || busy}><KeyRound className="h-4 w-4" /> Verify OTP</button>
      </form>
      <p className="mt-2 text-xs text-ink-400">The OTP is not shown anywhere in this app. It is sent to the Notification Service — read it from that service’s console (“Your OTP is: …”).</p>
      <div className="mt-3"><ErrorMessage error={error} title="OTP verification failed" /></div>

      <ConfirmDialog open={confirm} tone="warn" title="Submit OTP?" confirmLabel="Submit OTP" busy={busy} onConfirm={run} onCancel={() => setConfirm(false)}>
        A <b>wrong or expired OTP</b> cancels the transfer, refunds the sender and <b>blocks account {tx.senderAccountNumber}</b>. A blocked account cannot be unblocked from this app.
      </ConfirmDialog>
    </div>
  )
}

function ResultPanel({ result }) {
  const { tx, senderAfter, senderError, note } = result
  const stuck = tx.status === 'PENDING_VERIFICATION' && !note
  return (
    <div className="mt-3 rounded-xl border border-line bg-white p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-ink">Verification result</p>
        <StatusBadge status={tx.status} label={wasRefunded(tx) ? 'FLAGGED · refunded' : undefined} />
      </div>
      {note && <p className="mt-2 text-ink-500">{note}</p>}
      {tx.status === 'COMPLETED' && <p className="mt-2 flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Backend confirms COMPLETED at {formatDate(tx.completedAt)}.</p>}
      {tx.status === 'FLAGGED' && <p className="mt-2 text-red-700">Transaction flagged. {wasRefunded(tx) ? 'The Saga compensation refunded the sender.' : ''}</p>}
      {tx.failureReason && <p className="mt-2 break-words rounded-lg bg-surface p-2.5 text-ink-500"><b>Backend reason:</b> {tx.failureReason}</p>}
      {stuck && (
        <div className="mt-3">
          <Notice tone="warning" title="Backend did not complete the transfer">
            The verify call succeeded but the transaction is still PENDING_VERIFICATION. This is a backend issue, not a UI one: <code>verifyOTP()</code> calls <code>completeTransaction()</code>, which only runs for status PROCESSING. See <b>docs/BACKEND_NOTES.md</b> for the two-line fix. Do not verify again — the OTP is already used up and a second attempt would trigger a refund.
          </Notice>
        </div>
      )}
      {senderAfter && (
        <p className="mt-3 text-ink-500">
          Sender account now: <StatusBadge status={senderAfter.status} /> · balance <b>{formatMoney(senderAfter.balance)}</b>
          {tx.status === 'FLAGGED' && senderAfter.status === 'ACTIVE' && <span className="text-xs text-ink-400"> (blocking is asynchronous — re-check shortly if you used a wrong OTP)</span>}
        </p>
      )}
      {senderError && <p className="mt-3 text-xs text-ink-400">Could not read sender account afterwards: {senderError.message}</p>}
    </div>
  )
}

export default function FraudMonitoring() {
  const { accounts, transactions, failed, loading, loadedOnce, reload, setTransactions } = useTrackedTransactions()
  const [results, setResults] = useState({})
  const [lookupId, setLookupId] = useState('')
  const [lookupErr, setLookupErr] = useState(null)

  const pending = transactions.filter((t) => t.status === 'PENDING_VERIFICATION')
  const flagged = transactions.filter((t) => t.status === 'FLAGGED' || t.status === 'FAILED')

  const onVerified = (id, result) => {
    setResults((r) => ({ ...r, [id]: result }))
    setTransactions((list) => list.map((t) => (t.id === id ? result.tx : t)))
  }

  const addById = async (e) => {
    e.preventDefault()
    setLookupErr(null)
    try {
      const t = await getTransaction(lookupId.trim())
      setTransactions((list) => [t, ...list.filter((x) => x.id !== t.id)])
      setLookupId('')
    } catch (err) {
      setLookupErr(err.kind === 'server' ? 'Transaction not found (Transaction Service answered HTTP ' + err.status + ').' : err)
    }
  }

  return (
    <>
      <PageHeader title="Fraud monitoring & OTP" subtitle="Watch the real fraud-detection outcome of each transfer and complete OTP verification.">
        <button className="btn-secondary" onClick={reload} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
      </PageHeader>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {RULES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card card-pad">
            <span className="inline-flex rounded-lg bg-amber-50 p-2 text-amber-600"><Icon className="h-4 w-4" /></span>
            <p className="mt-3 font-semibold text-ink">{title}</p>
            <p className="mt-1 text-ink-400">{text}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <Notice title="How to read this page">
          Fraud detection has no REST API; it works through Kafka. The only visible signals are the transaction status and failure reason from the Transaction Service. A transfer that completes simply passed the checks — it does not prove the rules ran, so use the Services page and the fraud service console to confirm.
        </Notice>
      </div>

      <section className="mb-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink"><ShieldAlert className="h-4 w-4 text-amber-600" /> Awaiting OTP verification <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{pending.length}</span></h3>
        {loading && !loadedOnce && <LoadingSpinner label="Scanning transactions of tracked accounts…" />}
        {loadedOnce && pending.length === 0 && (
          <div className="card">
            <EmptyState icon={ShieldCheck} title="Nothing waiting for verification">
              {accounts.length === 0
                ? 'No accounts are tracked yet. Create accounts or send a transfer first.'
                : 'Suspicious transfers appear here. Try a transfer above 90% of the sender’s balance, or six quick transfers within a minute.'}
            </EmptyState>
          </div>
        )}
        <div className="space-y-4">
          {pending.map((t) => (
            <div key={t.id}>
              <OtpCard tx={t} onVerified={onVerified} />
              {results[t.id] && <ResultPanel result={results[t.id]} />}
            </div>
          ))}
          {/* results for transactions that have already left the pending list */}
          {Object.entries(results)
            .filter(([id]) => !pending.some((t) => t.id === id))
            .map(([id, r]) => (
              <div key={id}>
                <p className="mb-1 font-mono text-xs text-ink-400">{id}</p>
                <ResultPanel result={r} />
              </div>
            ))}
        </div>
      </section>

      <section className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h3 className="font-semibold text-ink">Flagged, refunded & failed</h3>
          <form className="flex w-full gap-2 sm:w-auto" onSubmit={addById}>
            <input className="input w-full font-mono text-xs sm:w-72" value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Look up a transaction ID" />
            <button className="btn-secondary" disabled={!lookupId.trim()}>Look up</button>
          </form>
        </div>
        {lookupErr && <div className="p-4"><ErrorMessage error={lookupErr} /></div>}
        {flagged.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No flagged transactions">Wrong or expired OTPs end here with the refund reason.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-line bg-surface/60"><tr><th className="th">Transaction</th><th className="th">Sender</th><th className="th text-right">Amount</th><th className="th">Status</th><th className="th">Reason from backend</th></tr></thead>
              <tbody className="divide-y divide-line">
                {flagged.map((t) => (
                  <tr key={t.id}>
                    <td className="td font-mono text-xs" title={t.id}>{t.id.slice(0, 8)}…<div className="font-sans text-ink-400">{formatDate(t.createdAt)}</div></td>
                    <td className="td font-mono text-xs">{t.senderAccountNumber}</td>
                    <td className="td text-right tabular-nums">{formatMoney(t.amount)}</td>
                    <td className="td"><StatusBadge status={t.status} label={wasRefunded(t) ? 'FLAGGED · refunded' : undefined} /></td>
                    <td className="td max-w-md break-words text-ink-500">{t.failureReason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {failed.length > 0 && (
        <ErrorMessage title={`Could not load history for ${failed.length} account(s)`} error={failed[0].error} onRetry={reload} />
      )}
      <p className="mt-4 flex items-center gap-2 text-xs text-ink-400"><Bell className="h-3.5 w-3.5" /> Scanned {accounts.length} account number(s) remembered in this browser.</p>
    </>
  )
}

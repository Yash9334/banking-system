import { useRef, useState } from 'react'
import { CheckCircle2, CircleDashed, CreditCard, ExternalLink, XCircle } from 'lucide-react'
import { createOrder } from '../api/paymentApi'
import CopyButton from '../components/CopyButton'
import EmptyState from '../components/EmptyState'
import ErrorMessage from '../components/ErrorMessage'
import Notice from '../components/Notice'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useToast } from '../components/ToastProvider'
import { accountsStore, logActivity, ordersStore, useStore } from '../utils/store'
import { ACCOUNT_NUMBER_RE, formatDate, formatMoney } from '../utils/format'

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const s = document.createElement('script')
    s.src = CHECKOUT_SRC
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

/** Four distinct stages so "order created" is never presented as "paid". */
const STAGES = [
  { key: 'order', label: 'Order created', hint: 'Payment Service created a Razorpay order and saved a CREATED record.' },
  { key: 'initiated', label: 'Payment initiated', hint: 'Razorpay Checkout was opened in this browser.' },
  { key: 'completed', label: 'Payment completed', hint: 'Razorpay Checkout reported success to the browser.' },
]

function Stage({ state, label, hint }) {
  const icon = state === 'done' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : state === 'failed' ? <XCircle className="h-5 w-5 text-red-600" /> : <CircleDashed className="h-5 w-5 text-ink-300" />
  return (
    <li className="flex gap-3">
      {icon}
      <div>
        <p className={`font-medium ${state === 'pending' ? 'text-ink-400' : 'text-ink'}`}>{label}</p>
        <p className="text-xs text-ink-400">{hint}</p>
      </div>
    </li>
  )
}

export default function Payments() {
  const toast = useToast()
  const orders = useStore(ordersStore)
  const tracked = useStore(accountsStore)
  const submitting = useRef(false)

  const [form, setForm] = useState({ accountNumber: '', amount: '', description: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)
  const [checkout, setCheckout] = useState({ stage: 'order', paymentId: null, failure: null })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (submitting.current) return
    const v = {}
    if (!ACCOUNT_NUMBER_RE.test(form.accountNumber.trim())) v.accountNumber = 'Account number must be 12 digits'
    if (form.amount === '' || Number(form.amount) <= 0) v.amount = 'Amount must be positive'
    setErrors(v)
    setError(null)
    if (Object.keys(v).length) return
    submitting.current = true
    setBusy(true)
    try {
      const created = await createOrder({ accountNumber: form.accountNumber.trim(), amount: Number(form.amount), description: form.description.trim() || null })
      const record = { ...created, accountNumber: form.accountNumber.trim(), description: form.description.trim(), createdAt: new Date().toISOString() }
      ordersStore.add(record, (o) => o.paymentId)
      accountsStore.add(record.accountNumber)
      logActivity('payment', `Razorpay order ${created.razorpayOrderId} created (${created.status})`, { status: created.status })
      setOrder(record)
      setCheckout({ stage: 'order', paymentId: null, failure: null })
      toast.success(`Order ${created.razorpayOrderId} created. Payment is NOT complete yet.`, 'Order created')
    } catch (err) {
      setError(err)
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  const openCheckout = async () => {
    const ok = await loadCheckout()
    if (!ok) {
      toast.error('Could not load checkout.razorpay.com. Check your internet connection or ad-blocker.', 'Razorpay Checkout unavailable')
      return
    }
    if (!order.razorpayKeyId) {
      toast.error('The backend response did not include a Razorpay key id.')
      return
    }
    const rzp = new window.Razorpay({
      key: order.razorpayKeyId, // public key id returned by the backend - the secret never leaves the backend
      amount: Math.round(Number(order.amount) * 100),
      currency: order.currency,
      order_id: order.razorpayOrderId,
      name: 'Digital Banking System',
      description: order.description || `Payment for account ${order.accountNumber}`,
      theme: { color: '#2563eb' },
      handler: (resp) => {
        setCheckout({ stage: 'completed', paymentId: resp.razorpay_payment_id, failure: null })
        logActivity('payment', `Checkout reported success for order ${order.razorpayOrderId}`, { status: 'CHECKOUT_SUCCESS' })
        toast.success('Razorpay reported the payment to your browser. The backend status is confirmed only by the webhook.', 'Checkout success')
      },
      modal: {
        ondismiss: () => setCheckout((c) => (c.stage === 'completed' ? c : { ...c, failure: c.failure || 'Checkout closed without completing payment.' })),
      },
    })
    rzp.on('payment.failed', (resp) => {
      const reason = resp?.error?.description || 'Payment failed in Razorpay Checkout.'
      setCheckout({ stage: 'failed', paymentId: null, failure: reason })
      logActivity('payment', `Checkout payment failed for order ${order.razorpayOrderId}: ${reason}`, { status: 'CHECKOUT_FAILED' })
    })
    setCheckout({ stage: 'initiated', paymentId: null, failure: null })
    rzp.open()
  }

  const stateOf = (key) => {
    if (checkout.stage === 'failed') return key === 'order' ? 'done' : key === 'initiated' ? 'done' : 'failed'
    const idx = { order: 0, initiated: 1, completed: 2 }
    return idx[key] <= idx[checkout.stage] ? 'done' : 'pending'
  }

  return (
    <>
      <PageHeader title="Razorpay payments" subtitle="Create a Razorpay order through the Payment Service and, optionally, pay it in Razorpay Test Mode." />

      <div className="mb-6">
        <Notice tone="warning" title="What this page can and cannot prove">
          The Payment Service only exposes <code>POST /create-order</code> and the Razorpay webhook. There is no endpoint to read a payment’s status, so the final status (COMPLETED / FAILED) set by the webhook cannot be displayed here. Order creation is shown as <b>CREATED</b>, never as paid.
        </Notice>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card card-pad lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink"><CreditCard className="h-4 w-4 text-brand" /> Create payment order</h3>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <div>
              <label className="label">Bank account number</label>
              <input className="input font-mono" list="pay-accounts" value={form.accountNumber} onChange={set('accountNumber')} placeholder="12 digits" inputMode="numeric" />
              <datalist id="pay-accounts">{tracked.map((n) => <option key={n} value={n} />)}</datalist>
              {errors.accountNumber && <p className="mt-1 text-xs text-red-600">{errors.accountNumber}</p>}
            </div>
            <div>
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" min="1" step="0.01" value={form.amount} onChange={set('amount')} placeholder="100" />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount}</p>}
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <input className="input" value={form.description} onChange={set('description')} placeholder="Wallet top-up" maxLength={120} />
            </div>
            <ErrorMessage error={error} title="Order was not created" />
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating order…' : 'Create Razorpay order'}</button>
          </form>
        </section>

        <section className="space-y-4 lg:col-span-3">
          {order ? (
            <>
              <div className="card card-pad">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink">Order details</h3>
                  <StatusBadge status={order.status} />
                </div>
                <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div><dt className="text-xs text-ink-400">Internal payment ID</dt><dd className="flex items-center gap-2 break-all font-mono text-xs">{order.paymentId}<CopyButton value={order.paymentId} /></dd></div>
                  <div><dt className="text-xs text-ink-400">Razorpay order ID</dt><dd className="flex items-center gap-2 break-all font-mono text-xs">{order.razorpayOrderId}<CopyButton value={order.razorpayOrderId} /></dd></div>
                  <div><dt className="text-xs text-ink-400">Amount</dt><dd className="font-medium">{formatMoney(order.amount)} <span className="text-ink-400">{order.currency}</span></dd></div>
                  <div><dt className="text-xs text-ink-400">Account</dt><dd className="font-mono text-xs">{order.accountNumber}</dd></div>
                </dl>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button className="btn-primary" onClick={openCheckout}><ExternalLink className="h-4 w-4" /> Open Razorpay Checkout (test mode)</button>
                  <span className="text-xs text-ink-400">Use Razorpay’s test cards/UPI — no real money moves with test keys.</span>
                </div>
              </div>

              <div className="card card-pad">
                <h3 className="mb-3 font-semibold text-ink">Payment lifecycle</h3>
                <ul className="space-y-3">
                  {STAGES.map((s) => <Stage key={s.key} state={stateOf(s.key)} label={s.label} hint={s.hint} />)}
                  {checkout.stage === 'failed' && <Stage state="failed" label="Payment failed" hint={checkout.failure} />}
                </ul>
                {checkout.failure && checkout.stage !== 'failed' && <p className="mt-3 text-xs text-amber-700">{checkout.failure}</p>}
                {checkout.stage === 'completed' && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-ink-500">Razorpay payment id: <span className="font-mono text-xs">{checkout.paymentId}</span></p>
                    <Notice title="Backend confirmation not visible">
                      This is the browser’s own success callback; its signature is not verified here (the backend has no verify endpoint). The Payment Service marks the record COMPLETED only when Razorpay’s <code>payment.captured</code> webhook reaches it — that needs a public URL (e.g. an ngrok tunnel) pointing at <code>/api/v1/payments/webhook</code>.
                    </Notice>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card"><EmptyState icon={CreditCard} title="No order yet">Fill in the form to create an order. The backend’s real response (payment ID, order ID, amount, status) is displayed here.</EmptyState></div>
          )}
        </section>
      </div>

      <section className="card mt-6">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-semibold text-ink">Orders created from this browser</h3>
            <p className="text-xs text-ink-400">Stored locally from backend responses — status shown is the status at creation time.</p>
          </div>
          {orders.length > 0 && <button className="btn-secondary" onClick={() => ordersStore.clear()}>Clear list</button>}
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={CreditCard} title="No orders created yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-line bg-surface/60"><tr><th className="th">Payment ID</th><th className="th">Razorpay order</th><th className="th">Account</th><th className="th text-right">Amount</th><th className="th">Status at creation</th><th className="th">Created</th></tr></thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.paymentId}>
                    <td className="td font-mono text-xs" title={o.paymentId}>{o.paymentId.slice(0, 8)}…</td>
                    <td className="td font-mono text-xs">{o.razorpayOrderId}</td>
                    <td className="td font-mono text-xs">{o.accountNumber}</td>
                    <td className="td text-right tabular-nums">{formatMoney(o.amount)}</td>
                    <td className="td"><StatusBadge status={o.status} /></td>
                    <td className="td whitespace-nowrap text-ink-500">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

import { ArrowRight, Cloud, Database, GitBranch, Globe, HardDrive, Layers, Mail, MemoryStick, Radio, ShieldAlert, ShieldCheck, Wallet, CreditCard, ArrowLeftRight } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import Notice from '../components/Notice'
import useServiceHealth from '../hooks/useServiceHealth'

const NODES = [
  { key: 'gateway', name: 'API Gateway', icon: Globe, port: 8080, text: 'Single entry point. Routes /api/v1/accounts, /transactions and /payments; rate-limits per client IP with Redis.' },
  { key: 'account', name: 'Account Service', icon: Wallet, port: 8081, text: 'Creates accounts, serves balances, blocks accounts, and exposes deduct/credit used by the Saga. Own DB: account_db.' },
  { key: 'transaction', name: 'Transaction Service', icon: ArrowLeftRight, port: 8082, text: 'Orchestrates the transfer Saga, stores transactions, issues and verifies OTPs (Redis), runs compensation refunds.' },
  { key: 'fraud', name: 'Fraud Detection Service', icon: ShieldAlert, port: 8084, text: 'Kafka-only. Checks velocity, unusual amount and balance share with Redis counters; publishes clean / verification-required.' },
  { key: 'payment', name: 'Payment Service', icon: CreditCard, port: 8083, text: 'Creates Razorpay orders, stores payments in payment_db, handles the Razorpay webhook and publishes payment events.' },
  { key: 'notification', name: 'Notification Service', icon: Mail, port: 8085, text: 'Kafka-only. Turns events into alerts (currently logged to the console, not e-mail/SMS).' },
  { key: 'kafka', name: 'Kafka', icon: Radio, port: 9092, text: 'Event backbone between services (transaction.*, fraud.*, verification.required, payment.*).' },
  { key: 'redis', name: 'Redis', icon: MemoryStick, port: 6379, text: 'Fraud velocity counters, running averages, OTP storage (5 min TTL) and gateway rate limiting.' },
  { key: 'mysql', name: 'MySQL', icon: Database, port: 3306, text: 'Persistent storage: account_db, transaction_db, payment_db (one schema per service).' },
]

const SYNC = { label: 'REST / Feign', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20' }
const ASYNC = { label: 'Kafka event', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20' }
const STORE = { label: 'Data store', cls: 'bg-slate-100 text-slate-600 ring-slate-500/20' }

const TRANSFER_FLOW = [
  { from: 'Browser', to: 'API Gateway → Transaction Service', via: SYNC, text: 'POST /api/v1/transactions/transfer' },
  { from: 'Transaction Service', to: 'Account Service', via: SYNC, text: 'Saga step 1 — deduct from sender (Feign, synchronous)' },
  { from: 'Transaction Service', to: 'MySQL', via: STORE, text: 'Save transaction as PROCESSING' },
  { from: 'Transaction Service', to: 'Kafka', via: ASYNC, text: 'Publish transaction.initiated' },
  { from: 'Fraud Detection', to: 'Account Service + Redis', via: SYNC, text: 'Read balance; increment velocity counter; compare average amount' },
  { from: 'Fraud Detection', to: 'Kafka', via: ASYNC, text: 'Clean → fraud.check.clean   |   Suspicious → verification.required' },
  { from: 'Transaction Service', to: 'Account Service', via: SYNC, text: 'Clean path: credit receiver → COMPLETED → transaction.completed' },
  { from: 'Transaction Service', to: 'Redis + Kafka', via: ASYNC, text: 'Suspicious path: store OTP (5 min) → PENDING_VERIFICATION → transaction.otp.generated' },
  { from: 'Notification Service', to: 'Console log', via: ASYNC, text: 'Prints the OTP alert (the only place the OTP is visible)' },
  { from: 'Browser', to: 'Transaction Service', via: SYNC, text: 'POST /transactions/{id}/verify?otp=… → refund + FLAGGED on wrong/expired OTP (account is blocked via fraud.detected)' },
]

const PAYMENT_FLOW = [
  { from: 'Browser', to: 'API Gateway → Payment Service', via: SYNC, text: 'POST /api/v1/payments/create-order' },
  { from: 'Payment Service', to: 'Razorpay (external)', via: SYNC, text: 'Create order with Key ID + Key Secret (secret stays on the backend)' },
  { from: 'Payment Service', to: 'MySQL', via: STORE, text: 'Save payment as CREATED' },
  { from: 'Browser', to: 'Razorpay Checkout (external)', via: SYNC, text: 'Customer pays in test mode using the order id and public key id' },
  { from: 'Razorpay (external)', to: 'Payment Service', via: SYNC, text: 'Webhook POST /api/v1/payments/webhook (needs a public URL)' },
  { from: 'Payment Service', to: 'Kafka → Notification Service', via: ASYNC, text: 'payment.completed / payment.failed' },
]

const LIFECYCLE = [
  ['PROCESSING', '→ COMPLETED'],
  ['PROCESSING', '→ PENDING_VERIFICATION → COMPLETED (see backend note) | FLAGGED (refund)'],
]

function Flow({ title, icon: Icon, steps, external }) {
  return (
    <section className="card">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4">
        <Icon className="h-4 w-4 text-brand" />
        <h3 className="font-semibold text-ink">{title}</h3>
        {external && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">external integration</span>}
      </div>
      <ol className="divide-y divide-line">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-4 px-5 py-3.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                <span>{s.from}</span><ArrowRight className="h-3.5 w-3.5 text-ink-300" /><span>{s.to}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.via.cls}`}>{s.via.label}</span>
              </p>
              <p className="mt-0.5 text-ink-400">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Architecture() {
  const { health, loading, refresh } = useServiceHealth()
  return (
    <>
      <PageHeader title="System architecture" subtitle="Nine moving parts, six deployable services. Health is read live from each service’s Actuator endpoint; Kafka, Redis and MySQL are checked by a TCP connect from the dev server.">
        <button className="btn-secondary" onClick={refresh} disabled={loading}>Refresh status</button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {NODES.map(({ key, name, icon: Icon, port, text }) => (
          <div key={key} className="card card-pad">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-brand-light p-2 text-brand"><Icon className="h-4 w-4" /></span>
                <div>
                  <p className="font-semibold text-ink">{name}</p>
                  <p className="text-xs text-ink-400">port {port}</p>
                </div>
              </div>
              {health[key] ? <StatusBadge status={health[key].status} /> : <span className="h-5 w-14 animate-pulse rounded-full bg-surface" />}
            </div>
            <p className="mt-3 text-ink-400">{text}</p>
            {health[key]?.status === 'UNREACHABLE' && key !== 'kafka' && key !== 'redis' && key !== 'mysql' && (
              <p className="mt-2 text-xs text-red-600">{health[key].detail}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mb-6">
        <Notice title="Browser → backend path">
          Browser → Vite dev proxy (avoids CORS) → API Gateway :8080 → service. The Fraud Detection and Notification services have no REST API and no gateway route; they are reached only through Kafka.
        </Notice>
      </div>

      <div className="space-y-6">
        <Flow title="Money transfer — Saga with fraud check" icon={GitBranch} steps={TRANSFER_FLOW} />

        <section className="card card-pad">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink"><Layers className="h-4 w-4 text-brand" /> Transaction status lifecycle (as implemented)</h3>
          <div className="space-y-2">
            {LIFECYCLE.map(([a, b], i) => (
              <p key={i} className="flex flex-wrap items-center gap-2 text-ink-500"><StatusBadge status={a} /> <span>{b}</span></p>
            ))}
            <p className="flex items-center gap-2 text-ink-500"><StatusBadge status="FAILED" /> <span>and</span> <StatusBadge status="PENDING" /> <span>exist in the enum but are never assigned by the current code.</span></p>
          </div>
        </section>

        <Flow title="Razorpay payment" icon={Cloud} steps={PAYMENT_FLOW} external />

        <p className="flex items-center gap-2 text-xs text-ink-400"><ShieldCheck className="h-3.5 w-3.5" /> <HardDrive className="h-3.5 w-3.5" /> Diagram reflects the code in your repository, including where it differs from a textbook Saga.</p>
      </div>
    </>
  )
}

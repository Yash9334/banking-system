import { Activity, Bell, CheckCircle2, XCircle } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import Notice from '../components/Notice'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { activityStore, useStore } from '../utils/store'
import { formatDate } from '../utils/format'

// Derived from notification-service/NotificationService.java in your repository.
const EVENTS = [
  { topic: 'transaction.otp.generated', from: 'Transaction Service', what: 'OTP verification requested', handler: 'consumeOtpGenerated', listening: true },
  { topic: 'transaction.refunded', from: 'Transaction Service', what: 'Refund processed (Saga compensation)', handler: 'consumeTransactionRefunded', listening: true },
  { topic: 'payment.completed', from: 'Payment Service', what: 'Payment successful', handler: 'consumePaymentCompleted', listening: true },
  { topic: 'payment.failed', from: 'Payment Service', what: 'Payment failed', handler: 'consumePaymentFailed', listening: true },
  { topic: 'transaction.completed', from: 'Transaction Service', what: 'Debit / credit alerts', handler: 'consumeTransactionCompleted', listening: false },
  { topic: 'fraud.detected', from: 'Transaction Service', what: 'Account blocked alert', handler: 'consumeFraudDetected', listening: false },
]

export default function Notifications() {
  const activity = useStore(activityStore)
  return (
    <>
      <PageHeader title="Notifications" subtitle="How the Notification Service works in your backend, and what this UI can legitimately show." />

      <div className="mb-6 space-y-4">
        <Notice tone="warning" title="No notification API exists">
          The Notification Service has no REST endpoint, no database and no WebSocket/SSE. It consumes Kafka events and writes a block to its console log (<code>sendAlert()</code>); nothing is sent by e-mail or SMS and nothing can be fetched by a browser. This page therefore shows no “delivered notifications”.
        </Notice>
        <Notice title="To show live notifications in the UI you would need">
          Either (a) a persisted <code>notifications</code> table plus <code>GET /api/v1/notifications?account=…</code> in the Notification Service and a gateway route, or (b) an SSE/WebSocket endpoint fed by the same Kafka consumers. OTPs should not be returned to the browser — deliver them through a real SMS/e-mail channel.
        </Notice>
      </div>

      <section className="card mb-6">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-semibold text-ink">Kafka events handled by the Notification Service</h3>
          <p className="text-xs text-ink-400">Read from the source code. “Listening” means the handler method carries <code>@KafkaListener</code>.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-line bg-surface/60"><tr><th className="th">Topic</th><th className="th">Published by</th><th className="th">Notification</th><th className="th">Handler</th><th className="th">Listening</th></tr></thead>
            <tbody className="divide-y divide-line">
              {EVENTS.map((e) => (
                <tr key={e.topic}>
                  <td className="td font-mono text-xs">{e.topic}</td>
                  <td className="td text-ink-500">{e.from}</td>
                  <td className="td">{e.what}</td>
                  <td className="td font-mono text-xs text-ink-500">{e.handler}()</td>
                  <td className="td">
                    {e.listening
                      ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> yes</span>
                      : <span className="inline-flex items-center gap-1 text-red-700"><XCircle className="h-4 w-4" /> no @KafkaListener</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-ink"><Activity className="h-4 w-4 text-brand" /> Activity observed by this UI</h3>
            <p className="text-xs text-ink-400">Status changes this browser saw in real backend responses. These are <b>not</b> notifications delivered to customers.</p>
          </div>
          {activity.length > 0 && <button className="btn-secondary" onClick={() => activityStore.clear()}>Clear</button>}
        </div>
        {activity.length === 0 ? (
          <EmptyState icon={Bell} title="Nothing observed yet">Send a transfer or create an order and the status changes will be listed here.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-ink">{a.message}</p>
                  <p className="text-xs text-ink-400">{formatDate(a.at)} · {a.type}</p>
                </div>
                {a.status && <StatusBadge status={a.status} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

import { Ban, RefreshCw } from 'lucide-react'
import StatusBadge from './StatusBadge'
import CopyButton from './CopyButton'
import { formatDate, formatMoney } from '../utils/format'

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="text-ink-400">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-ink">{children}</dd>
    </div>
  )
}

export default function AccountCard({ account, onBlock, onRefresh, refreshing }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 bg-ink p-5 text-white">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-white/60">Current balance</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{formatMoney(account.balance)}</p>
          <p className="mt-3 flex items-center gap-2 font-mono text-sm text-white/80">
            {account.accountNumber}
            <span className="[&_svg]:text-white/50 [&_button:hover_svg]:text-white"><CopyButton value={account.accountNumber} /></span>
          </p>
        </div>
        <StatusBadge status={account.status} />
      </div>
      <dl className="divide-y divide-line px-5 py-2">
        <Row label="Account holder">{account.accountHolderName}</Row>
        <Row label="Type">{account.accountType}</Row>
        <Row label="Email">{account.email}</Row>
        <Row label="Phone">{account.phone}</Row>
        <Row label="Daily limit">{formatMoney(account.dailyTransactionLimit)}</Row>
        <Row label="Opened">{formatDate(account.createdAt)}</Row>
      </dl>
      <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface/50 px-5 py-3">
        {onRefresh && (
          <button className="btn-secondary" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh balance
          </button>
        )}
        {onBlock && (
          <button className="btn-secondary !text-red-600 hover:!bg-red-50" onClick={onBlock} disabled={account.status === 'BLOCKED'}>
            <Ban className="h-4 w-4" /> {account.status === 'BLOCKED' ? 'Blocked' : 'Block account'}
          </button>
        )}
      </div>
    </div>
  )
}

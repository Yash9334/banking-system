import { ArrowLeftRight } from 'lucide-react'
import StatusBadge from './StatusBadge'
import EmptyState from './EmptyState'
import CopyButton from './CopyButton'
import { formatDate, formatMoney, shortId } from '../utils/format'
import { wasRefunded } from '../utils/status'

export default function TransactionTable({ transactions, emptyTitle = 'No transactions', emptyText, compact = false, onSelect }) {
  if (!transactions || transactions.length === 0) {
    return <EmptyState icon={ArrowLeftRight} title={emptyTitle}>{emptyText}</EmptyState>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-line bg-surface/60">
          <tr>
            <th className="th">Transaction ID</th>
            <th className="th">Sender</th>
            <th className="th">Receiver</th>
            <th className="th text-right">Amount</th>
            <th className="th">Status</th>
            <th className="th">Timestamp</th>
            {!compact && <th className="th">Description</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {transactions.map((t) => (
            <tr key={t.id} className={onSelect ? 'cursor-pointer hover:bg-surface/60' : ''} onClick={() => onSelect?.(t)}>
              <td className="td">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-500" title={t.id}>
                  {shortId(t.id)}
                  <CopyButton value={t.id} />
                </span>
              </td>
              <td className="td font-mono text-xs">{t.senderAccountNumber}</td>
              <td className="td font-mono text-xs">{t.receiverAccountNumber}</td>
              <td className="td text-right font-medium tabular-nums">{formatMoney(t.amount)}</td>
              <td className="td">
                <StatusBadge status={t.status} label={wasRefunded(t) ? 'FLAGGED · refunded' : undefined} />
              </td>
              <td className="td whitespace-nowrap text-ink-500">{formatDate(t.createdAt)}</td>
              {!compact && <td className="td max-w-[220px] truncate text-ink-500" title={t.description || ''}>{t.description || '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

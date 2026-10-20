import { STATUS_STYLES } from '../utils/status'

export default function StatusBadge({ status, label }) {
  if (!status) return <span className="text-ink-300">—</span>
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-500/20'
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {label || status}
    </span>
  )
}

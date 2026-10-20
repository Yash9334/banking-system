import { Info, AlertTriangle } from 'lucide-react'

export default function Notice({ tone = 'info', title, children }) {
  const t = tone === 'warning'
    ? { box: 'border-amber-200 bg-amber-50 text-amber-900', Icon: AlertTriangle }
    : { box: 'border-blue-200 bg-blue-50 text-blue-900', Icon: Info }
  return (
    <div className={`flex gap-3 rounded-lg border p-3.5 ${t.box}`}>
      <t.Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  )
}

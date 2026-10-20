export default function StatCard({ label, value, hint, icon: Icon, tone = 'default', loading = false }) {
  const tones = {
    default: 'bg-brand-light text-brand',
    success: 'bg-emerald-50 text-emerald-600',
    danger: 'bg-red-50 text-red-600',
    warning: 'bg-amber-50 text-amber-600',
    muted: 'bg-slate-100 text-slate-500',
  }
  const unavailable = value === 'Not available'
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
        {Icon && (
          <span className={`rounded-lg p-2 ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-3 font-semibold ${unavailable ? 'text-base text-ink-300' : 'text-2xl text-ink'}`}>
        {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-surface" /> : value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

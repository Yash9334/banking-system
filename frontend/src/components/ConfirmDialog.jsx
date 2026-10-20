import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', tone = 'primary', busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null
  const btn = tone === 'danger' ? 'btn-danger' : tone === 'warn' ? 'btn-warn' : 'btn-primary'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true">
      <div className="card w-full max-w-md p-6 shadow-xl">
        <div className="flex items-start gap-3">
          {tone !== 'primary' && (
            <div className={`rounded-full p-2 ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <div className="mt-2 text-ink-500">{children}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={btn} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

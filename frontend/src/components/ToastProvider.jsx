import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-emerald-600' },
  error: { icon: XCircle, cls: 'text-red-600' },
  warning: { icon: AlertTriangle, cls: 'text-amber-600' },
  info: { icon: Info, cls: 'text-brand' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const show = useCallback(
    (type, message, title) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((t) => [...t.slice(-3), { id, type, message, title }])
      setTimeout(() => dismiss(id), 5000)
    },
    [dismiss]
  )

  const api = useMemo(
    () => ({
      success: (m, t) => show('success', m, t),
      error: (m, t) => show('error', m, t),
      warning: (m, t) => show('warning', m, t),
      info: (m, t) => show('info', m, t),
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type]
          return (
            <div key={t.id} role="status" className="pointer-events-auto flex gap-3 rounded-xl border border-line bg-white p-3.5 shadow-lg">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} />
              <div className="min-w-0 flex-1">
                {t.title && <p className="font-semibold text-ink">{t.title}</p>}
                <p className="break-words text-ink-500">{t.message}</p>
              </div>
              <button onClick={() => dismiss(t.id)} className="text-ink-300 hover:text-ink" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

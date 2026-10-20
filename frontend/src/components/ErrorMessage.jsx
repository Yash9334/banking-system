import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorMessage({ error, onRetry, title }) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message
  const service = typeof error === 'object' && error.service && error.kind !== 'validation' ? error.service : null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3.5 text-red-800">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title || (service ? `${service} error` : 'Something went wrong')}</p>
        <p className="mt-0.5 break-words text-red-700">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary !px-2.5 !py-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  )
}

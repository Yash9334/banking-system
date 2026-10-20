import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-8 text-ink-400 ${className}`} role="status">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </div>
  )
}

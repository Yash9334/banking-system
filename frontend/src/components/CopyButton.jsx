import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyButton({ value }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      /* clipboard blocked - ignore */
    }
  }
  return (
    <button type="button" onClick={copy} className="text-ink-300 hover:text-brand" title="Copy" aria-label="Copy">
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

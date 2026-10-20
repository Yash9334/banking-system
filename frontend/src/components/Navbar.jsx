import { Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const TITLES = {
  '/': 'Dashboard',
  '/accounts': 'Accounts',
  '/transactions': 'Transactions',
  '/fraud': 'Fraud monitoring & OTP',
  '/payments': 'Razorpay payments',
  '/notifications': 'Notifications',
  '/architecture': 'System architecture',
}

export default function Navbar({ onMenu }) {
  const { pathname } = useLocation()
  const mode = typeof __API_MODE__ !== 'undefined' ? __API_MODE__ : 'gateway'
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur sm:px-8">
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-ink-500 hover:bg-surface lg:hidden" onClick={onMenu} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-ink">{TITLES[pathname] || 'Digital Banking'}</h2>
      </div>
      <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-500 ring-1 ring-inset ring-line">
        API: {mode === 'direct' ? 'direct to services' : 'via API Gateway :8080'}
      </span>
    </header>
  )
}

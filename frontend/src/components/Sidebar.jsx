import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, ArrowLeftRight, ShieldAlert, CreditCard, Bell, Network, Landmark, X } from 'lucide-react'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/accounts', label: 'Accounts', icon: Users },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/fraud', label: 'Fraud & OTP', icon: ShieldAlert },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/architecture', label: 'Architecture', icon: Network },
]

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-brand p-1.5 text-white"><Landmark className="h-5 w-5" /></span>
            <div className="leading-tight">
              <p className="font-semibold text-ink">Digital Banking</p>
              <p className="text-xs text-ink-400">Microservices demo</p>
            </div>
          </div>
          <button className="text-ink-400 lg:hidden" onClick={onClose} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition ${isActive ? 'bg-brand-light text-brand' : 'text-ink-500 hover:bg-surface hover:text-ink'}`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-4 text-xs text-ink-400">
          Spring Boot · Kafka · Redis · MySQL · Razorpay
        </div>
      </aside>
    </>
  )
}

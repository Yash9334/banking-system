import { RefreshCw } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { REST_SERVICES, INFRA } from '../api/serviceHealthApi'

export function ServiceRow({ name, sub, result }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="font-medium text-ink">{name}</p>
        <p className="truncate text-xs text-ink-400">{result?.detail || sub}</p>
      </div>
      {result ? <StatusBadge status={result.status} /> : <span className="h-5 w-14 animate-pulse rounded-full bg-surface" />}
    </li>
  )
}

export default function ServiceStatusList({ health, loading, onRefresh, includeInfra = true }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <h3 className="font-semibold text-ink">Service status</h3>
          <p className="text-xs text-ink-400">Actuator /health · infra via TCP probe</p>
        </div>
        <button className="btn-secondary !px-2.5 !py-1.5" onClick={onRefresh} disabled={loading} aria-label="Refresh service status">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <ul className="divide-y divide-line px-5">
        {REST_SERVICES.map((s) => (
          <ServiceRow key={s.key} name={s.name} sub={`:${s.port}`} result={health[s.key]} />
        ))}
        {includeInfra &&
          INFRA.map((s) => <ServiceRow key={s.key} name={s.name} sub={`:${s.port}`} result={health[s.key]} />)}
      </ul>
    </div>
  )
}

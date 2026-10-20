import { Link } from 'react-router-dom'
import { Activity, ArrowLeftRight, CheckCircle2, CreditCard, KeyRound, RefreshCw, ShieldAlert, Users, XCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import TransactionTable from '../components/TransactionTable'
import ServiceStatusList from '../components/ServiceStatusList'
import ErrorMessage from '../components/ErrorMessage'
import Notice from '../components/Notice'
import useServiceHealth from '../hooks/useServiceHealth'
import useTrackedTransactions from '../hooks/useTrackedTransactions'
import { ordersStore, useStore } from '../utils/store'

const NA = 'Not available'
const CHART_COLORS = { COMPLETED: '#059669', PROCESSING: '#2563eb', PENDING_VERIFICATION: '#d97706', FLAGGED: '#dc2626', FAILED: '#991b1b', PENDING: '#94a3b8' }

export default function Dashboard() {
  const { accounts, transactions, failed, loading, loadedOnce, reload } = useTrackedTransactions()
  const { health, loading: healthLoading, refresh } = useServiceHealth()
  const orders = useStore(ordersStore)

  const count = (...s) => transactions.filter((t) => s.includes(t.status)).length
  const noAccounts = accounts.length === 0
  const val = (n) => (noAccounts ? NA : n)

  const chartData = Object.keys(CHART_COLORS)
    .map((status) => ({ status: status.replace('_', ' '), key: status, count: count(status) }))
    .filter((d) => d.count > 0)

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live figures from the backend. Where an aggregate endpoint does not exist, the number is computed only from accounts this browser has seen.">
        <button className="btn-secondary" onClick={() => { reload(); refresh() }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </PageHeader>

      {noAccounts && (
        <div className="mb-6">
          <Notice title="Start by creating an account">
            The backend has no “list all accounts / transactions” endpoints, so the dashboard follows accounts you create or look up in this browser. <Link to="/accounts" className="font-semibold underline">Go to Accounts</Link>.
          </Notice>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total accounts (system)" value={NA} hint="No list/count endpoint in Account Service" icon={Users} tone="muted" />
        <StatCard label="Tracked accounts" value={accounts.length} hint="Created or looked up in this browser" icon={Users} />
        <StatCard label="Transactions sent" value={val(transactions.length)} hint="From tracked accounts (sender side)" icon={ArrowLeftRight} loading={loading && !loadedOnce} />
        <StatCard label="Successful" value={val(count('COMPLETED'))} hint="Status COMPLETED" icon={CheckCircle2} tone="success" loading={loading && !loadedOnce} />
        <StatCard label="Failed / flagged" value={val(count('FAILED', 'FLAGGED'))} hint="FAILED or FLAGGED (refunded)" icon={XCircle} tone="danger" loading={loading && !loadedOnce} />
        <StatCard label="Pending OTP" value={val(count('PENDING_VERIFICATION'))} hint="Awaiting verification" icon={KeyRound} tone="warning" loading={loading && !loadedOnce} />
        <StatCard label="In progress" value={val(count('PROCESSING', 'PENDING'))} hint="PROCESSING" icon={Activity} loading={loading && !loadedOnce} />
        <StatCard label="Payment orders" value={orders.length} hint="Created here · live status: Not available (no GET endpoint)" icon={CreditCard} />
      </div>

      {failed.length > 0 && (
        <div className="mt-6">
          <ErrorMessage title={`History could not be loaded for ${failed.length} account(s)`} error={failed[0].error} onRetry={reload} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="font-semibold text-ink">Recent transactions</h3>
              <Link to="/transactions" className="text-sm font-medium text-brand hover:underline">View all</Link>
            </div>
            <TransactionTable
              compact
              transactions={transactions.slice(0, 8)}
              emptyTitle={noAccounts ? 'No data yet' : 'No transactions yet'}
              emptyText={noAccounts ? 'Create an account and send a transfer to see activity.' : 'Tracked accounts have not sent any money.'}
            />
          </section>

          {chartData.length > 0 && (
            <section className="card card-pad">
              <h3 className="mb-4 font-semibold text-ink">Transactions by status</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e8ee" />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#697386' }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#697386' }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#f6f9fc' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((d) => <Cell key={d.key} fill={CHART_COLORS[d.key]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <ServiceStatusList health={health} loading={healthLoading} onRefresh={refresh} />
          {count('PENDING_VERIFICATION') > 0 && (
            <Notice tone="warning" title={`${count('PENDING_VERIFICATION')} transaction(s) need an OTP`}>
              <Link to="/fraud" className="inline-flex items-center gap-1 font-semibold underline"><ShieldAlert className="h-4 w-4" /> Open fraud monitoring</Link>
            </Notice>
          )}
        </div>
      </div>
    </>
  )
}

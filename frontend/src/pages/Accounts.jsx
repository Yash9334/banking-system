import { useState } from 'react'
import { Search, UserPlus, Users } from 'lucide-react'
import { ACCOUNT_TYPES, createAccount, lookupAccount, getBalance, blockAccount } from '../api/accountApi'
import { ApiError } from '../api/axios'
import AccountCard from '../components/AccountCard'
import ConfirmDialog from '../components/ConfirmDialog'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/ToastProvider'
import { accountsStore, logActivity, useStore } from '../utils/store'
import { ACCOUNT_NUMBER_RE } from '../utils/format'

const EMPTY = { accountHolderName: '', email: '', phone: '', accountType: 'SAVINGS', initialDeposit: '' }

// Mirrors the validation annotations on CreateAccountRequest
function validate(f) {
  const e = {}
  if (!f.accountHolderName.trim()) e.accountHolderName = 'Account holder is required'
  if (!f.email.trim()) e.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Invalid email format'
  if (!f.phone.trim()) e.phone = 'Phone is required'
  else if (!/^[+\d][\d\s-]{5,17}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number'
  if (!f.accountType) e.accountType = 'Account type is required'
  if (f.initialDeposit === '' || Number(f.initialDeposit) <= 0) e.initialDeposit = 'Initial deposit must be positive'
  return e
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function Accounts() {
  const toast = useToast()
  const tracked = useStore(accountsStore)

  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const [query, setQuery] = useState('')
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lookupError, setLookupError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [blocking, setBlocking] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submitCreate = async (e) => {
    e.preventDefault()
    if (creating) return
    const v = validate(form)
    setErrors(v)
    setCreateError(null)
    if (Object.keys(v).length) return
    setCreating(true)
    try {
      const created = await createAccount({
        accountHolderName: form.accountHolderName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        accountType: form.accountType,
        initialDeposit: Number(form.initialDeposit),
      })
      accountsStore.add(created.accountNumber)
      logActivity('account', `Account ${created.accountNumber} created`)
      setAccount(created)
      setQuery(created.accountNumber)
      setLookupError(null)
      setForm(EMPTY)
      toast.success(`Account ${created.accountNumber} created for ${created.accountHolderName}.`, 'Account created')
    } catch (err) {
      // The backend rejects a duplicate e-mail with a RuntimeException -> HTTP 500
      const hint = err instanceof ApiError && err.kind === 'server' ? ' If this e-mail already has an account, the backend rejects duplicates.' : ''
      setCreateError(err.kind === 'server' ? new ApiError({ ...err, message: err.message + hint }) : err)
    } finally {
      setCreating(false)
    }
  }

  const search = async (number) => {
    const n = (number ?? query).trim()
    if (!ACCOUNT_NUMBER_RE.test(n)) {
      setLookupError('Account numbers are 12 digits.')
      return
    }
    setLoading(true)
    setLookupError(null)
    try {
      const a = await lookupAccount(n)
      setAccount(a)
      setQuery(n)
      accountsStore.add(n)
    } catch (err) {
      setAccount(null)
      setLookupError(err)
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      const balance = await getBalance(account.accountNumber)
      setAccount((a) => ({ ...a, balance }))
      toast.info('Balance refreshed from Account Service.')
    } catch (err) {
      toast.error(err.message, 'Could not refresh balance')
    } finally {
      setRefreshing(false)
    }
  }

  const doBlock = async () => {
    setBlocking(true)
    try {
      await blockAccount(account.accountNumber)
      const fresh = await lookupAccount(account.accountNumber) // confirm, don't assume
      setAccount(fresh)
      if (fresh.status === 'BLOCKED') {
        logActivity('account', `Account ${fresh.accountNumber} blocked`)
        toast.success(`Account ${fresh.accountNumber} is now BLOCKED.`, 'Account blocked')
      } else {
        toast.warning(`Block request returned OK but status is ${fresh.status}.`)
      }
    } catch (err) {
      toast.error(err.message, 'Block failed')
    } finally {
      setBlocking(false)
      setConfirmBlock(false)
    }
  }

  return (
    <>
      <PageHeader title="Accounts" subtitle="Create accounts and look them up by account number. All data comes from the Account Service." />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card card-pad lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink"><UserPlus className="h-4 w-4 text-brand" /> Create account</h3>
          <form onSubmit={submitCreate} noValidate className="space-y-4">
            <Field label="Account holder name" error={errors.accountHolderName}>
              <input className="input" value={form.accountHolderName} onChange={set('accountHolderName')} placeholder="Full name" />
            </Field>
            <Field label="Email" error={errors.email}>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Account type" error={errors.accountType}>
                <select className="input" value={form.accountType} onChange={set('accountType')}>
                  {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </Field>
              <Field label="Initial deposit (₹)" error={errors.initialDeposit}>
                <input className="input" type="number" min="0" step="0.01" value={form.initialDeposit} onChange={set('initialDeposit')} placeholder="10000" />
              </Field>
            </div>
            <ErrorMessage error={createError} title="Could not create account" />
            <button className="btn-primary w-full" disabled={creating}>{creating ? 'Creating…' : 'Create account'}</button>
          </form>
        </section>

        <section className="space-y-4 lg:col-span-3">
          <div className="card card-pad">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-ink"><Search className="h-4 w-4 text-brand" /> Find account</h3>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); search() }}>
              <input className="input font-mono" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="12-digit account number" inputMode="numeric" />
              <button className="btn-primary" disabled={loading}>Search</button>
            </form>
            {tracked.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-400">Seen in this browser:</span>
                {tracked.slice(0, 6).map((n) => (
                  <button key={n} className="rounded-full bg-surface px-2.5 py-1 font-mono text-xs text-ink-500 ring-1 ring-inset ring-line hover:text-brand" onClick={() => search(n)}>{n}</button>
                ))}
              </div>
            )}
          </div>

          {loading && <LoadingSpinner label="Fetching account…" />}
          {lookupError && !loading && <ErrorMessage error={lookupError} title="Lookup failed" />}
          {account && !loading && (
            <AccountCard account={account} onRefresh={refresh} refreshing={refreshing} onBlock={() => setConfirmBlock(true)} />
          )}
          {!account && !loading && !lookupError && (
            <div className="card">
              <EmptyState icon={Users} title="No account selected">
                Create an account or search by its 12-digit number. The backend has no “list all accounts” endpoint, so numbers you have created or looked up are remembered in this browser.
              </EmptyState>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmBlock}
        tone="danger"
        title="Block this account?"
        confirmLabel="Block account"
        busy={blocking}
        onConfirm={doBlock}
        onCancel={() => setConfirmBlock(false)}
      >
        Account <span className="font-mono font-medium">{account?.accountNumber}</span> will be set to BLOCKED. A blocked account cannot send money. The backend has no unblock endpoint.
      </ConfirmDialog>
    </>
  )
}

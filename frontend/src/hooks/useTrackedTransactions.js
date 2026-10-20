import { useCallback, useEffect, useState } from 'react'
import { getHistory } from '../api/transactionApi'
import { accountsStore, useStore } from '../utils/store'

const CHUNK = 3 // stay well below the gateway rate limit (10 req/s)

/**
 * The backend has no "all transactions" endpoint, only history per sender account.
 * This hook fetches the history of every account number this browser has seen.
 */
export default function useTrackedTransactions() {
  const accounts = useStore(accountsStore)
  const [transactions, setTransactions] = useState([])
  const [failed, setFailed] = useState([]) // [{account, error}]
  const [loading, setLoading] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    const rows = new Map()
    const errs = []
    for (let i = 0; i < accounts.length; i += CHUNK) {
      const slice = accounts.slice(i, i + CHUNK)
      const results = await Promise.allSettled(slice.map((a) => getHistory(a)))
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') r.value.forEach((t) => rows.set(t.id, t))
        else errs.push({ account: slice[idx], error: r.reason })
      })
    }
    setTransactions([...rows.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
    setFailed(errs)
    setLoading(false)
    setLoadedOnce(true)
  }, [accounts])

  useEffect(() => {
    reload()
  }, [reload])

  return { accounts, transactions, failed, loading, loadedOnce, reload, setTransactions }
}

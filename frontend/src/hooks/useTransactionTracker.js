import { useEffect, useRef, useState } from 'react'
import { getTransaction, TERMINAL_STATUSES } from '../api/transactionApi'
import { logActivity } from '../utils/store'

const POLL_MS = 2000
const MAX_MS = 90000

/**
 * Polls GET /transactions/{id} (never re-submits the transfer) until:
 *  - a terminal status (COMPLETED / FAILED / FLAGGED), or
 *  - PENDING_VERIFICATION (waiting for the user's OTP), or
 *  - 90s pass while still PROCESSING.
 */
export default function useTransactionTracker(initialTx) {
  const [tx, setTx] = useState(initialTx || null)
  const [error, setError] = useState(null)
  const [polling, setPolling] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const lastStatus = useRef(initialTx?.status)
  const id = initialTx?.id

  useEffect(() => {
    setTx(initialTx || null)
    setError(null)
    setTimedOut(false)
    lastStatus.current = initialTx?.status
    if (!id) {
      setPolling(false)
      return undefined
    }
    let cancelled = false
    const startedAt = Date.now()
    let timer

    const stopStatuses = [...TERMINAL_STATUSES, 'PENDING_VERIFICATION']

    const tick = async () => {
      try {
        const fresh = await getTransaction(id)
        if (cancelled) return
        setTx(fresh)
        setError(null)
        if (fresh.status !== lastStatus.current) {
          lastStatus.current = fresh.status
          logActivity('transaction', `Transaction ${id.slice(0, 8)}… is now ${fresh.status}`, { status: fresh.status, transactionId: id })
        }
        if (stopStatuses.includes(fresh.status)) {
          setPolling(false)
          return
        }
      } catch (e) {
        if (cancelled) return
        setError(e)
      }
      if (Date.now() - startedAt > MAX_MS) {
        setPolling(false)
        setTimedOut(true)
        return
      }
      timer = setTimeout(tick, POLL_MS)
    }

    if (stopStatuses.includes(initialTx.status)) {
      setPolling(false)
    } else {
      setPolling(true)
      timer = setTimeout(tick, POLL_MS)
    }
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return { tx, error, polling, timedOut, setTx }
}

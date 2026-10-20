import { useSyncExternalStore } from 'react'

/**
 * Tiny localStorage-backed list store.
 * It only remembers things the backend itself returned (account numbers, payment orders,
 * statuses the UI observed) because the backend has no "list all" endpoints.
 */
function read(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage may be blocked - the UI still works for this session */
  }
}

export function createStore(key, limit = 100) {
  let snapshot = read(key)
  const listeners = new Set()
  const emit = () => listeners.forEach((l) => l())
  const commit = (next) => {
    snapshot = next
    write(key, next)
    emit()
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    add: (item, idOf = (x) => x) => {
      const id = idOf(item)
      commit([item, ...snapshot.filter((x) => idOf(x) !== id)].slice(0, limit))
    },
    push: (item) => commit([item, ...snapshot].slice(0, limit)),
    remove: (item, idOf = (x) => x) => commit(snapshot.filter((x) => idOf(x) !== idOf(item))),
    clear: () => commit([]),
  }
}

export const useStore = (store) => useSyncExternalStore(store.subscribe, store.getSnapshot)

// Account numbers seen in this browser (created or looked up successfully)
export const accountsStore = createStore('dbs.accounts', 50)
// Razorpay orders created from this browser (exact backend responses)
export const ordersStore = createStore('dbs.paymentOrders', 50)
// Events the UI observed (status changes etc.) - NOT delivered notifications
export const activityStore = createStore('dbs.activity', 100)

export function logActivity(type, message, meta = {}) {
  activityStore.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: new Date().toISOString(), type, message, ...meta })
}

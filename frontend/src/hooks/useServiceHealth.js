import { useCallback, useEffect, useState } from 'react'
import { REST_SERVICES, INFRA, checkService, probeInfra } from '../api/serviceHealthApi'

/** Polls actuator health for the 6 REST services and TCP-probes Kafka/Redis/MySQL. */
export default function useServiceHealth(intervalMs = 20000) {
  const [health, setHealth] = useState({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const entries = await Promise.all([
      ...REST_SERVICES.map(async (s) => [s.key, await checkService(s.key)]),
      ...INFRA.map(async (s) => [s.key, await probeInfra(s.key)]),
    ])
    setHealth(Object.fromEntries(entries))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
  }, [refresh, intervalMs])

  return { health, loading, refresh }
}

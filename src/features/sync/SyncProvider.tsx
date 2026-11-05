import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '@/features/auth/useAuth'
import { getUserDb } from '@/lib/db'
import { syncAll } from '@/lib/sync'
import { SyncContext } from './useSync'

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const db = useMemo(() => (userId ? getUserDb(userId) : null), [userId])

  const [online, setOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const running = useRef(false)

  const pending = useLiveQuery(
    () => (db ? db.outbox.filter((i) => !i.error).count() : 0),
    [db],
    0,
  )
  const failed = useLiveQuery(
    () => (db ? db.outbox.filter((i) => !!i.error).count() : 0),
    [db],
    0,
  )

  const syncNow = useCallback(async () => {
    if (!db || running.current || !navigator.onLine) return
    running.current = true
    setSyncing(true)
    try {
      await syncAll(db)
    } catch {
      // Falla transitoria de red: la cola sigue intacta y se reintenta sola
    } finally {
      running.current = false
      setSyncing(false)
    }
  }, [db])

  useEffect(() => {
    const sincronizar = () => void syncNow()
    const alConectar = () => {
      setOnline(true)
      sincronizar()
    }
    const alDesconectar = () => setOnline(false)
    const alVolver = () => {
      if (document.visibilityState === 'visible') sincronizar()
    }

    window.addEventListener('online', alConectar)
    window.addEventListener('offline', alDesconectar)
    document.addEventListener('visibilitychange', alVolver)
    const intervalo = window.setInterval(sincronizar, 30_000)
    void navigator.storage?.persist?.()
    sincronizar()

    return () => {
      window.removeEventListener('online', alConectar)
      window.removeEventListener('offline', alDesconectar)
      document.removeEventListener('visibilitychange', alVolver)
      window.clearInterval(intervalo)
    }
  }, [syncNow])

  if (!db) return null

  return (
    <SyncContext.Provider value={{ db, online, syncing, pending, failed, syncNow }}>
      {children}
    </SyncContext.Provider>
  )
}
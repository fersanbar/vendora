import { createContext, useContext } from 'react'
import type { VendoraDB } from '@/lib/db'

export interface SyncState {
  db: VendoraDB
  online: boolean
  syncing: boolean
  pending: number
  failed: number
  syncNow: () => Promise<void>
}

export const SyncContext = createContext<SyncState | null>(null)

export function useSync(): SyncState {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync debe usarse dentro de SyncProvider')
  return ctx
}
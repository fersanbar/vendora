import { useLiveQuery } from 'dexie-react-hooks'
import { useSync } from '@/features/sync/useSync'

export const IVA_GENERAL_POR_DEFECTO = 16

export function useIvaGeneral(): number {
  const { db } = useSync()
  const perfil = useLiveQuery(() => db.profiles.toCollection().first(), [db])
  return perfil?.iva_general_pct ?? IVA_GENERAL_POR_DEFECTO
}
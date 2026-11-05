import { Cloud, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { useSync } from './useSync'

export function SyncStatus() {
  const { online, syncing, pending, failed, syncNow } = useSync()

  let icono = <Cloud className="size-4" />
  let texto = 'Sincronizado'
  let color = 'text-neutral-500'

  if (!online) {
    icono = <CloudOff className="size-4" />
    texto = pending > 0 ? `Sin conexión · ${pending} pendientes` : 'Sin conexión'
  } else if (failed > 0) {
    icono = <TriangleAlert className="size-4" />
    texto = `${failed} con error`
    color = 'text-red-600'
  } else if (syncing) {
    icono = <RefreshCw className="size-4 animate-spin" />
    texto = 'Sincronizando…'
  } else if (pending > 0) {
    texto = `${pending} por sincronizar`
  }

  return (
    <button
      onClick={() => void syncNow()}
      className={`inline-flex h-9 items-center gap-1.5 text-xs ${color}`}
    >
      {icono}
      {texto}
    </button>
  )
}
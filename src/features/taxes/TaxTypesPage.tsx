import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import type { LocalTaxType } from '@/lib/db'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { useSync } from '@/features/sync/useSync'
import { TaxTypeForm } from './TaxTypeForm'
import { IvaGeneralCard } from './IvaGeneralCard'

export function TaxTypesPage() {
  const { db } = useSync()
  const [abierto, setAbierto] = useState(false)
  const [seleccionado, setSeleccionado] = useState<LocalTaxType | null>(null)

  const tipos = useLiveQuery(
    async () =>
      (await db.tax_types.toArray())
        .filter((t) => t.deleted_at === null)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [db],
  )

  function abrir(t: LocalTaxType | null) {
    setSeleccionado(t)
    setAbierto(true)
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <Link to="/mas" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Más
      </Link>
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Impuestos</h1>
        <SyncStatus />
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Tus tipos de impuesto. Los asignas a cada producto al publicarlo en un canal.
      </p>
    <IvaGeneralCard />

      <div className="mt-5 space-y-2">
        {tipos === undefined && <div className="h-16 animate-pulse rounded-xl bg-neutral-100" />}
        {tipos && tipos.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Aún no hay impuestos. Si acabas de actualizar, conéctate a internet para descargar IVA e ISR, o crea uno.
          </p>
        )}
        {tipos?.map((t) => (
          <button
            key={t.id}
            onClick={() => abrir(t)}
            className={`flex min-h-14 w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-2 text-left ${
              t.activo ? '' : 'text-neutral-400'
            }`}
          >
            <span className="font-medium">{t.nombre}</span>
            <span className="text-xs text-neutral-500">
              {t.activo ? (t.tasa_pct !== null ? `${t.tasa_pct}%` : 'Sin tasa') : 'Archivado'}
            </span>
          </button>
        ))}
      </div>

      <Button
        onClick={() => abrir(null)}
        className="fixed right-4 z-20 size-14 rounded-full shadow-lg bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
        aria-label="Agregar tipo de impuesto"
      >
        <Plus className="size-6" />
      </Button>

      <Drawer open={abierto} onOpenChange={setAbierto}>
        <DrawerContent>
          <TaxTypeForm key={seleccionado?.id ?? 'nuevo'} tipo={seleccionado} onDone={() => setAbierto(false)} />
        </DrawerContent>
      </Drawer>
    </div>
  )
}
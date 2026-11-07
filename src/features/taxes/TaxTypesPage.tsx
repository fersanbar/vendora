
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Plus, ReceiptText, Percent, Archive, ChevronRight } from 'lucide-react'
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
    <div className="min-h-full bg-slate-50/70 px-4 pb-28 pt-4">
      {/* Encabezado */}
      <Link
        to="/mas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-[#172554]"
      >
        <ChevronLeft className="size-4" />
        Más opciones
      </Link>

      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-sm">
            <ReceiptText size={21} />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-slate-400">
              VENDORA
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Impuestos
            </h1>
          </div>
        </div>
        <SyncStatus />
      </div>

      <p className="mb-5 text-sm leading-relaxed text-slate-500">
        Administra tus tipos de impuesto y asigna las tasas correspondientes a
        tus productos al publicarlos en cada canal.
      </p>

      {/* IVA general */}
      <div className="mb-6">
        <IvaGeneralCard />
      </div>

      {/* Tipos de impuesto */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Tipos de impuesto
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tasas configuradas en tu cuenta
          </p>
        </div>
        {tipos && (
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            {tipos.length} {tipos.length === 1 ? 'tipo' : 'tipos'}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {tipos === undefined && (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[76px] animate-pulse rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </>
        )}

        {tipos && tipos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Percent size={23} />
            </div>
            <h3 className="font-semibold text-slate-800">
              Aún no hay impuestos
            </h3>
            <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-slate-500">
              Si acabas de actualizar, conéctate a internet para descargar IVA
              e ISR, o crea tu primer tipo de impuesto.
            </p>
          </div>
        )}

        {tipos?.map((t) => (
          <button
            key={t.id}
            onClick={() => abrir(t)}
            className={`group flex min-h-[76px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md ${
              t.activo ? '' : 'opacity-60'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                t.activo
                  ? 'bg-violet-50 text-violet-700'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {t.activo ? <Percent size={19} /> : <Archive size={19} />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {t.nombre}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {t.activo ? 'Impuesto activo' : 'Archivado'}
                </p>
              </div>
            </div>

            <div className="ml-3 flex shrink-0 items-center gap-2">
              <span className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                t.activo
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {t.activo
                  ? (t.tasa_pct !== null ? `${t.tasa_pct}%` : 'Sin tasa')
                  : 'Archivado'}
              </span>
              <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
            </div>
          </button>
        ))}
      </div>

      {/* Botón agregar */}
      <Button
        onClick={() => abrir(null)}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-14 rounded-2xl bg-gradient-to-r from-[#172554] to-[#6336a9] shadow-lg shadow-indigo-950/20 transition hover:scale-105 hover:opacity-95"
        aria-label="Agregar tipo de impuesto"
      >
        <Plus className="size-6" />
      </Button>

      {/* Formulario */}
      <Drawer open={abierto} onOpenChange={setAbierto}>
        <DrawerContent>
          <TaxTypeForm
            key={seleccionado?.id ?? 'nuevo'}
            tipo={seleccionado}
            onDone={() => setAbierto(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}

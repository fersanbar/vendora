import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Megaphone, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { NavegadorMes } from '@/components/NavegadorMes'
import type { LocalAdSpend } from '@/lib/db'
import { formatearFecha, periodoActual } from '@/lib/dates'
import { calcularRoas } from '@/lib/finanzas'
import { formatMXN, sumar } from '@/lib/money'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { useSync } from '@/features/sync/useSync'
import { AdForm } from './AdForm'
import { etiquetaPlataforma } from './plataformas'

export function AdsPage() {
  const { db } = useSync()
  const [periodo, setPeriodo] = useState(periodoActual())
  const [abierto, setAbierto] = useState(false)
  const [seleccionado, setSeleccionado] = useState<LocalAdSpend | null>(null)

  const datos = useLiveQuery(async () => {
    const productos = await db.products.toArray()
    const canales = await db.channels.toArray()
    const anuncios = (await db.ad_spends.toArray()).filter((a) => a.deleted_at === null)
    return { productos, canales, anuncios }
  }, [db])

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }

  const { productos, canales, anuncios } = datos
  const nombreProducto = new Map(productos.map((p) => [p.id, p.nombre]))
  const nombreCanal = new Map(canales.map((c) => [c.id, c.nombre]))

  const delMes = anuncios
    .filter((a) => a.fecha.startsWith(periodo))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))
  const gastoMes = sumar(delMes.map((a) => a.monto))

  // El ROAS del mes solo usa los registros que tienen ventas atribuidas
  const conAtribucion = delMes.filter((a) => a.ventas_atribuidas !== null)
  const roasMes = calcularRoas(
    sumar(conAtribucion.map((a) => a.ventas_atribuidas ?? 0)),
    sumar(conAtribucion.map((a) => a.monto)),
  )

  function abrir(a: LocalAdSpend | null) {
    setSeleccionado(a)
    setAbierto(true)
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <Link to="/finanzas" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Finanzas
      </Link>
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Publicidad</h1>
        <SyncStatus />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Gasto del mes</p>
          <p className="mt-1 text-lg font-semibold">{formatMXN(gastoMes)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">ROAS del mes</p>
          <p className="mt-1 text-lg font-semibold">{roasMes === null ? '—' : `${roasMes}x`}</p>
          {delMes.length > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              Con {conAtribucion.length} de {delMes.length} registros
            </p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="mt-4 space-y-2">
        {delMes.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <Megaphone className="mx-auto size-8 text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-500">Sin gasto en publicidad este mes.</p>
            <Button className="mt-4" onClick={() => abrir(null)}>
              Registrar gasto
            </Button>
          </div>
        )}

        {delMes.map((a) => {
          const roas = a.ventas_atribuidas !== null ? calcularRoas(a.ventas_atribuidas, a.monto) : null
          const destino = [
            a.channel_id ? nombreCanal.get(a.channel_id) : null,
            a.product_id ? nombreProducto.get(a.product_id) : null,
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <button
              key={a.id}
              onClick={() => abrir(a)}
              className="flex min-h-16 w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-2 text-left"
            >
              <div>
                <p className="font-medium">{etiquetaPlataforma(a.plataforma)}</p>
                <p className="text-xs text-neutral-500">
                  {formatearFecha(a.fecha)}
                  {destino ? ` · ${destino}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatMXN(a.monto)}</p>
                {roas !== null && <p className="text-xs text-neutral-500">ROAS {roas}x</p>}
              </div>
            </button>
          )
        })}
      </div>

      <Button
        onClick={() => abrir(null)}
        className="fixed right-4 z-20 size-14 rounded-full shadow-lg bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
        aria-label="Registrar gasto en publicidad"
      >
        <Plus className="size-6" />
      </Button>

      <Drawer open={abierto} onOpenChange={setAbierto}>
        <DrawerContent>
          <AdForm
            key={seleccionado?.id ?? 'nuevo'}
            anuncio={seleccionado}
            canales={canales}
            productos={productos}
            onDone={() => setAbierto(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}
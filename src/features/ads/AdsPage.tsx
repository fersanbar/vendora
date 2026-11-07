
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Plus,
  Wallet,
  TrendingUp,
  CalendarDays,
  Target,
} from 'lucide-react'

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

function Metrica({
  etiqueta,
  valor,
  icono: Icono,
  nota,
  color = 'violet',
}: {
  etiqueta: string
  valor: string
  icono: typeof Wallet
  nota?: string
  color?: 'violet' | 'blue'
}) {
  const colores = {
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
        <div className={`flex size-9 items-center justify-center rounded-xl ${colores[color]}`}>
          <Icono className="size-[18px]" />
        </div>
      </div>

      <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">
        {valor}
      </p>

      {nota && (
        <p className="mt-1 text-xs text-slate-400">{nota}</p>
      )}
    </div>
  )
}

export function AdsPage() {
  const { db } = useSync()
  const [periodo, setPeriodo] = useState(periodoActual())
  const [abierto, setAbierto] = useState(false)
  const [seleccionado, setSeleccionado] = useState<LocalAdSpend | null>(null)

  const datos = useLiveQuery(async () => {
    const productos = await db.products.toArray()
    const canales = await db.channels.toArray()
    const anuncios = (await db.ad_spends.toArray()).filter(
      (a) => a.deleted_at === null,
    )

    return { productos, canales, anuncios }
  }, [db])

  if (datos === undefined) {
    return (
      <div className="space-y-4 px-4 pt-5">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    )
  }

  const { productos, canales, anuncios } = datos

  const nombreProducto = new Map(productos.map((p) => [p.id, p.nombre]))
  const nombreCanal = new Map(canales.map((c) => [c.id, c.nombre]))

  const delMes = anuncios
    .filter((a) => a.fecha.startsWith(periodo))
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        b.created_at.localeCompare(a.created_at),
    )

  const gastoMes = sumar(delMes.map((a) => a.monto))

  const conAtribucion = delMes.filter(
    (a) => a.ventas_atribuidas !== null,
  )

  const roasMes = calcularRoas(
    sumar(conAtribucion.map((a) => a.ventas_atribuidas ?? 0)),
    sumar(conAtribucion.map((a) => a.monto)),
  )

  function abrir(a: LocalAdSpend | null) {
    setSeleccionado(a)
    setAbierto(true)
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-28 pt-5">
      {/* Encabezado */}
      <Link
        to="/finanzas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-violet-700"
      >
        <ChevronLeft className="size-4" />
        Finanzas
      </Link>

      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
            VENDORA
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Publicidad
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Controla tu inversión en anuncios
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <SyncStatus />
        </div>
      </header>

      {/* Resumen */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Rendimiento del periodo
          </h2>
          <CalendarDays className="size-4 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Metrica
            etiqueta="Gasto del mes"
            valor={formatMXN(gastoMes)}
            icono={Wallet}
            color="blue"
          />

          <Metrica
            etiqueta="ROAS del mes"
            valor={roasMes === null ? '—' : `${roasMes}x`}
            icono={TrendingUp}
            nota={
              delMes.length > 0
                ? `${conAtribucion.length} de ${delMes.length} registros atribuidos`
                : 'Sin registros todavía'
            }
          />
        </div>
      </section>

      {/* Periodo */}
      <div className="mt-6">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      {/* Registros */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Registros de publicidad
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {delMes.length} {delMes.length === 1 ? 'movimiento' : 'movimientos'} en este periodo
            </p>
          </div>
        </div>

        {delMes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Megaphone className="size-7" />
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              Sin gastos de publicidad
            </h3>

            <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
              Registra tus campañas para conocer cuánto inviertes y qué resultados generan.
            </p>

            <Button
              className="mt-5 rounded-xl bg-[#172554] hover:bg-[#263b78]"
              onClick={() => abrir(null)}
            >
              <Plus className="mr-2 size-4" />
              Registrar gasto
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {delMes.map((a) => {
              const roas =
                a.ventas_atribuidas !== null
                  ? calcularRoas(a.ventas_atribuidas, a.monto)
                  : null

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
                  className="group flex min-h-[76px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-100">
                      <Megaphone className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {etiquetaPlataforma(a.plataforma)}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {formatearFecha(a.fecha)}
                        {destino ? ` · ${destino}` : ''}
                      </p>

                      {roas !== null && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                          <Target className="size-3" />
                          ROAS {roas}x
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {formatMXN(a.monto)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Gasto
                      </p>
                    </div>

                    <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Botón flotante */}
      {delMes.length > 0 && (
        <Button
          onClick={() => abrir(null)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-14 rounded-2xl bg-gradient-to-br from-[#172554] to-[#6336A9] text-white shadow-lg shadow-indigo-950/20 transition hover:scale-105 hover:from-[#263b78] hover:to-violet-700"
          aria-label="Registrar gasto en publicidad"
        >
          <Plus className="size-6" />
        </Button>
      )}

      {/* Formulario */}
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

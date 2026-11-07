
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock3,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavegadorMes } from '@/components/NavegadorMes'
import { formatearFecha, hoyLocal, periodoActual } from '@/lib/dates'
import { calcularPedido, formatMXN, sumar } from '@/lib/money'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { useSync } from '@/features/sync/useSync'
import { agruparLineas } from './pedidos'
import { markSaleReleased } from './sales.repo'

export function SalesPage() {
  const { db, syncNow } = useSync()
  const navigate = useNavigate()

  const [periodo, setPeriodo] = useState(periodoActual())
  const [liberando, setLiberando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const datos = useLiveQuery(async () => {
    const productos = new Map(
      (await db.products.toArray()).map((p) => [p.id, p.nombre]),
    )

    const canales = new Map(
      (await db.channels.toArray()).map((c) => [c.id, c.nombre]),
    )

    const ventas = (await db.sales.toArray()).filter(
      (v) => v.deleted_at === null,
    )

    const lineas = agruparLineas(await db.sale_items.toArray())

    return { productos, canales, ventas, lineas }
  }, [db])

  if (datos === undefined) {
    return (
      <div className="min-h-screen bg-slate-50/70 p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-36 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  const { productos, canales, ventas, lineas } = datos
  const hoy = hoyLocal()

  const calculos = ventas.map((venta) => {
    const ls = lineas.get(venta.id) ?? []

    return {
      venta,
      lineas: ls,
      c: calcularPedido({
        lineas: ls,
        costo_envio: venta.costo_envio,
        impuestos: venta.impuestos,
      }),
    }
  })

  const delMes = calculos
    .filter((x) => x.venta.fecha.startsWith(periodo))
    .sort(
      (a, b) =>
        b.venta.fecha.localeCompare(a.venta.fecha) ||
        b.venta.created_at.localeCompare(a.venta.created_at),
    )

  const ingresosMes = sumar(delMes.map((x) => x.c.ingreso))
  const utilidadMes = sumar(delMes.map((x) => x.c.utilidad ?? 0))
  const sinCosto = delMes.filter((x) => x.c.utilidad === null).length

  const pendiente = sumar(
    calculos
      .filter((x) => x.venta.estado_cobro === 'pendiente')
      .map((x) => x.c.neto),
  )

  const ventasPendientes = calculos.filter(
    (x) => x.venta.estado_cobro === 'pendiente',
  ).length

  async function liberar(id: string) {
    if (liberando) return

    setLiberando(id)
    setError(null)

    try {
      await markSaleReleased(db, id)
      void syncNow()
    } catch {
      setError('No se pudo actualizar el estado de la venta.')
    } finally {
      setLiberando(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 pb-28 pt-4">
      <div className="mx-auto max-w-3xl">
        {/* Encabezado */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-sm">
                  <ShoppingBag size={20} />
                </div>
                <span className="text-xs font-bold tracking-[0.18em] text-slate-500">
                  VENDORA
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Ventas
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Controla tus pedidos, ingresos y cobros.
              </p>
            </div>

            <SyncStatus />
          </div>
        </div>

        {/* Resumen principal */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] p-5 text-white shadow-lg shadow-indigo-950/10">
          <div className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Wallet size={17} />
            Ingresos del mes
          </div>

          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {formatMXN(ingresosMes)}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
            <div>
              <p className="text-xs text-white/60">Utilidad del mes</p>
              <p
                className={`mt-1 text-lg font-bold tabular-nums ${
                  utilidadMes < 0 ? 'text-rose-200' : 'text-emerald-300'
                }`}
              >
                {formatMXN(utilidadMes)}
              </p>
              {sinCosto > 0 && (
                <p className="mt-1 text-[11px] text-white/60">
                  {sinCosto} {sinCosto === 1 ? 'venta' : 'ventas'} sin costo
                  completo
                </p>
              )}
            </div>

            <div className="border-l border-white/15 pl-4">
              <p className="text-xs text-white/60">Pedidos del mes</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {delMes.length}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                {delMes.reduce((total, x) => total + x.c.piezas, 0)} piezas
                vendidas
              </p>
            </div>
          </div>
        </section>

        {/* Pendiente de liberar */}
        <section className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock3 size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-amber-800">
                Pendiente de liberar
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-amber-950">
                {formatMXN(pendiente)}
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                {ventasPendientes}{' '}
                {ventasPendientes === 1 ? 'pedido pendiente' : 'pedidos pendientes'} ·
                todas las fechas
              </p>
            </div>
          </div>
        </section>

        {/* Navegador de periodo */}
        <div className="mb-4 mt-7">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={17} className="text-violet-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Historial de ventas
            </h2>
          </div>

          <NavegadorMes periodo={periodo} onChange={setPeriodo} />
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700"
          >
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        {/* Lista */}
        <div className="space-y-3">
          {delMes.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <Receipt size={25} />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Sin ventas en este periodo
              </h3>

              <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                Cuando registres una venta, aparecerá aquí con su desglose
                financiero.
              </p>

              <Button
                className="mt-5 rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9]"
                onClick={() => navigate('/ventas/nueva')}
              >
                <Plus size={17} className="mr-2" />
                Registrar una venta
              </Button>
            </div>
          )}

          {delMes.map(({ venta: v, lineas: ls, c }) => {
            const pendienteCobro = v.estado_cobro === 'pendiente'

            const vencida =
              pendienteCobro &&
              v.fecha_liberacion_estimada !== null &&
              v.fecha_liberacion_estimada < hoy

            const textoEstado = pendienteCobro
              ? v.fecha_liberacion_estimada
                ? `${vencida ? 'Debía liberarse el' : 'Libera el'} ${formatearFecha(v.fecha_liberacion_estimada)}`
                : 'Pendiente de liberación'
              : `Liberado${
                  v.fecha_liberacion_real
                    ? ` el ${formatearFecha(v.fecha_liberacion_real)}`
                    : ''
                }`

            const principal = c.utilidad ?? c.neto

            const primero = ls[0]
              ? (productos.get(ls[0].product_id) ?? 'Producto')
              : 'Sin productos'

            const titulo =
              ls.length > 1
                ? `${primero} +${ls.length - 1} más`
                : primero

            return (
              <article
                key={v.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3 p-3.5">
                  <Link
                    to={`/ventas/${v.id}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
                    aria-label={`Ver venta ${titulo}`}
                  >
                    <Receipt size={20} />
                  </Link>

                  <Link
                    to={`/ventas/${v.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm font-bold text-slate-900">
                      {titulo}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {canales.get(v.channel_id) ?? 'Canal'} ·{' '}
                      {formatearFecha(v.fecha)}
                    </p>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {c.piezas} {c.piezas === 1 ? 'pieza' : 'piezas'}
                      {v.id_orden ? ` · Orden ${v.id_orden}` : ''}
                    </p>
                  </Link>

                  <div className="shrink-0 text-right">
                    <p
                      className={`text-sm font-bold tabular-nums ${
                        principal < 0
                          ? 'text-rose-600'
                          : c.utilidad !== null
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                      }`}
                    >
                      {formatMXN(principal)}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {c.utilidad !== null ? 'Utilidad' : 'Neto sin costo'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3.5 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {pendienteCobro ? (
                      <span
                        className={`flex items-center gap-1.5 text-xs font-semibold ${
                          vencida ? 'text-rose-600' : 'text-amber-700'
                        }`}
                      >
                        {vencida ? (
                          <AlertCircle size={14} />
                        ) : (
                          <Clock3 size={14} />
                        )}
                        {textoEstado}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <Check size={14} />
                        {textoEstado}
                      </span>
                    )}
                  </div>

                  {pendienteCobro && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={liberando !== null}
                      className="h-8 rounded-lg border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      onClick={() => void liberar(v.id)}
                    >
                      {liberando === v.id ? (
                        'Actualizando...'
                      ) : (
                        <>
                          <Check size={14} className="mr-1" />
                          Liberado
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {/* Nota de utilidad */}
        {delMes.length > 0 && sinCosto > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-500">
            <Package size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <p>
              La utilidad mostrada suma únicamente las ventas con costos
              completos. Completa los costos de tus productos para obtener un
              análisis más preciso.
            </p>
          </div>
        )}
      </div>

      {/* Botón flotante */}
      <Button
        onClick={() => navigate('/ventas/nueva')}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-14 rounded-2xl bg-gradient-to-br from-[#172554] to-[#6336a9] shadow-lg shadow-indigo-950/20 transition hover:scale-105 hover:opacity-95"
        aria-label="Registrar venta"
      >
        <Plus size={25} />
      </Button>
    </div>
  )
}

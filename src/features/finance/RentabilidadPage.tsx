
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  Package,
  Store,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChartNoAxesCombined,
  ShoppingBag,
  Percent,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { NavegadorMes } from '@/components/NavegadorMes'
import { periodoActual } from '@/lib/dates'
import { calcularPedido, formatMXN } from '@/lib/money'
import {
  agregarPorCanal,
  agregarPorProducto,
  calcularLineasPedido,
} from '@/lib/rentabilidad'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { pedidoDe } from './calculos'
import { useDatosFinancieros } from './useDatosFinancieros'

type Vista = 'producto' | 'canal'

// Los que no tienen utilidad (sin costo) van al final
function porUtilidad(a: number | null, b: number | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return b - a
}

function Indicador({
  etiqueta,
  valor,
  icon: Icon,
}: {
  etiqueta: string
  valor: string
  icon: typeof TrendingUp
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2">
      <Icon className="size-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400">{etiqueta}</p>
        <p className="truncate text-xs font-semibold text-slate-700">
          {valor}
        </p>
      </div>
    </div>
  )
}

export function RentabilidadPage() {
  const datos = useDatosFinancieros()
  const [periodo, setPeriodo] = useState(periodoActual())
  const [vista, setVista] = useState<Vista>('producto')

  if (datos === undefined) {
    return (
      <div className="min-h-full bg-slate-50/70 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  const ventasMes = datos.ventas.filter((v) =>
    v.fecha.startsWith(periodo),
  )

  const nombreProducto = new Map(
    datos.productos.map((p) => [p.id, p.nombre]),
  )

  const nombreCanal = new Map(
    datos.canales.map((c) => [c.id, c.nombre]),
  )

  const porProducto = agregarPorProducto(
    ventasMes.flatMap((v) =>
      calcularLineasPedido({
        lineas: datos.lineas.get(v.id) ?? [],
        costo_envio: v.costo_envio,
        impuestos: v.impuestos,
      }),
    ),
  ).sort((a, b) => porUtilidad(a.utilidad, b.utilidad))

  const porCanal = agregarPorCanal(
    ventasMes.map((v) => {
      const c = calcularPedido(pedidoDe(v, datos.lineas))

      return {
        channel_id: v.channel_id,
        ingreso: c.ingreso,
        neto: c.neto,
        utilidad: c.utilidad,
        piezas: c.piezas,
      }
    }),
  ).sort((a, b) => porUtilidad(a.utilidad, b.utilidad))

  const productosConUtilidad = porProducto.filter(
    (p) => p.utilidad !== null,
  )

  const canalesConUtilidad = porCanal.filter(
    (c) => c.utilidad !== null,
  )

  const utilidadProducto = productosConUtilidad.reduce(
    (total, p) => total + (p.utilidad ?? 0),
    0,
  )

  const utilidadCanal = canalesConUtilidad.reduce(
    (total, c) => total + (c.utilidad ?? 0),
    0,
  )

  const utilidadTotal =
    vista === 'producto' ? utilidadProducto : utilidadCanal

  const elementos =
    vista === 'producto' ? porProducto.length : porCanal.length

  const color = (n: number) =>
    n < 0 ? 'text-rose-600' : 'text-emerald-600'

  const utilidadPositiva = utilidadTotal >= 0

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Navegación */}
        <Link
          to="/finanzas"
          className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-violet-600"
        >
          <ChevronLeft className="size-4" />
          Finanzas
        </Link>

        {/* Encabezado */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <ChartNoAxesCombined className="size-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Rentabilidad
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Descubre qué productos y canales generan más utilidad.
              </p>
            </div>
          </div>

          <SyncStatus />
        </div>

        {/* Periodo */}
        <div className="mb-5">
          <NavegadorMes periodo={periodo} onChange={setPeriodo} />
        </div>

        {/* Selector de vista */}
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm shadow-slate-200/30">
          <Button
            type="button"
            variant={vista === 'producto' ? 'default' : 'ghost'}
            className={`h-11 rounded-xl transition ${
              vista === 'producto'
                ? 'bg-[#172554] text-white shadow-sm hover:bg-[#263b78]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            onClick={() => setVista('producto')}
          >
            <Package className="mr-2 size-4" />
            Por producto
          </Button>

          <Button
            type="button"
            variant={vista === 'canal' ? 'default' : 'ghost'}
            className={`h-11 rounded-xl transition ${
              vista === 'canal'
                ? 'bg-[#172554] text-white shadow-sm hover:bg-[#263b78]'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            onClick={() => setVista('canal')}
          >
            <Store className="mr-2 size-4" />
            Por canal
          </Button>
        </div>

        {/* Resumen */}
        <section className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] p-5 text-white shadow-lg shadow-indigo-950/10 sm:p-6">
          <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-8 size-40 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                {vista === 'producto' ? (
                  <Package className="size-4 text-white/80" />
                ) : (
                  <Store className="size-4 text-white/80" />
                )}
              </div>

              <p className="text-sm font-medium text-white/75">
                Utilidad {vista === 'producto' ? 'por producto' : 'por canal'}
              </p>
            </div>

            <p
              className={`mt-4 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${
                utilidadPositiva ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {formatMXN(utilidadTotal)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  utilidadPositiva
                    ? 'bg-emerald-400/15 text-emerald-200'
                    : 'bg-rose-400/15 text-rose-200'
                }`}
              >
                {utilidadPositiva ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {utilidadPositiva ? 'Utilidad positiva' : 'Resultado negativo'}
              </span>

              <span className="text-xs text-white/55">
                {elementos} {vista === 'producto' ? 'productos' : 'canales'}
              </span>
            </div>
          </div>
        </section>

        {/* Listado */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {vista === 'producto'
                  ? 'Rentabilidad por producto'
                  : 'Rentabilidad por canal'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Ordenados de mayor a menor utilidad.
              </p>
            </div>

            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
              {elementos} registros
            </span>
          </div>

          {ventasMes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <ShoppingBag className="size-6" />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-800">
                Sin ventas en este mes
              </h3>

              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                Cuando registres ventas, podrás consultar aquí la rentabilidad
                de tus productos y canales.
              </p>
            </div>
          ) : vista === 'producto' ? (
            porProducto.length > 0 ? (
              <div className="space-y-3">
                {porProducto.map((p) => {
                  const nombre =
                    nombreProducto.get(p.product_id) ?? 'Producto'

                  return (
                    <article
                      key={p.product_id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 transition hover:border-violet-200 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                            <Package className="size-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-slate-900">
                              {nombre}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              {p.piezas} {p.piezas === 1 ? 'pieza' : 'piezas'}
                              {' · '}
                              ventas {formatMXN(p.ingreso)}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {p.utilidad === null ? (
                            <p className="text-sm font-medium text-slate-400">
                              Sin costo
                            </p>
                          ) : (
                            <>
                              <p className={`text-base font-bold tabular-nums ${color(p.utilidad)}`}>
                                {formatMXN(p.utilidad)}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                Utilidad
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {p.utilidad !== null && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Indicador
                            etiqueta="ROI"
                            valor={
                              p.roiPct === null ? '—' : `${p.roiPct}%`
                            }
                            icon={TrendingUp}
                          />

                          <Indicador
                            etiqueta="Margen"
                            valor={
                              p.margenPct === null
                                ? '—'
                                : `${p.margenPct}%`
                            }
                            icon={Percent}
                          />
                        </div>
                      )}

                      {p.lineasSinCosto > 0 && p.utilidad !== null && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5">
                          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                          <p className="text-xs leading-relaxed text-amber-800">
                            {p.lineasSinCosto}{' '}
                            {p.lineasSinCosto === 1
                              ? 'línea sin costo no cuenta'
                              : 'líneas sin costo no cuentan'}{' '}
                            en la utilidad.
                          </p>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
                <p className="text-sm text-slate-500">
                  No hay productos para mostrar en este periodo.
                </p>
              </div>
            )
          ) : porCanal.length > 0 ? (
            <div className="space-y-3">
              {porCanal.map((c) => {
                const nombre = nombreCanal.get(c.channel_id) ?? 'Canal'

                return (
                  <article
                    key={c.channel_id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 transition hover:border-violet-200 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                          <Store className="size-5" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-slate-900">
                            {nombre}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            {c.pedidos}{' '}
                            {c.pedidos === 1 ? 'pedido' : 'pedidos'}
                            {' · '}
                            ventas {formatMXN(c.ingreso)}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {c.utilidad === null ? (
                          <p className="text-sm font-medium text-slate-400">
                            Sin costo
                          </p>
                        ) : (
                          <>
                            <p className={`text-base font-bold tabular-nums ${color(c.utilidad)}`}>
                              {formatMXN(c.utilidad)}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Utilidad
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {c.utilidad !== null && (
                      <div className="mt-4">
                        <Indicador
                          etiqueta="Margen"
                          valor={
                            c.margenPct === null
                              ? '—'
                              : `${c.margenPct}%`
                          }
                          icon={Percent}
                        />
                      </div>
                    )}

                    {c.pedidosSinCosto > 0 && c.utilidad !== null && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
                        <p className="text-xs leading-relaxed text-amber-800">
                          {c.pedidosSinCosto}{' '}
                          {c.pedidosSinCosto === 1
                            ? 'pedido con costo incompleto no cuenta'
                            : 'pedidos con costo incompleto no cuentan'}{' '}
                          en la utilidad.
                        </p>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <p className="text-sm text-slate-500">
                No hay canales para mostrar en este periodo.
              </p>
            </div>
          )}
        </section>

        {/* Explicación */}
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-slate-400" />

          <p className="text-xs leading-relaxed text-slate-500">
            {vista === 'producto'
              ? 'Cada producto recibe una parte del envío y de los impuestos del pedido, en proporción a su ingreso.'
              : 'Por canal se cuentan pedidos completos: los que tienen costo incompleto no entran a la utilidad.'}
          </p>
        </div>
      </div>
    </div>
  )
}

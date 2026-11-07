
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  TriangleAlert,
  Wallet,
  TrendingUp,
  Clock3,
  Package,
  ArrowUpRight,
} from 'lucide-react'

import { NavegadorMes } from '@/components/NavegadorMes'
import {
  etiquetaMesCorta,
  hoyLocal,
  periodoActual,
  ultimosPeriodos,
} from '@/lib/dates'
import { valorInventario } from '@/lib/inventario'
import { formatMXN } from '@/lib/money'
import {
  flujoDelMes,
  resumenDelMes,
} from '@/features/finance/calculos'
import { useDatosFinancieros } from '@/features/finance/useDatosFinancieros'
import { useProductStats } from '@/features/purchases/useProductStats'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { GraficaUtilidad } from './GraficaUtilidad'

function Tarjeta({
  etiqueta,
  valor,
  nota,
  icono: Icono,
  negativo = false,
}: {
  etiqueta: string
  valor: string
  nota?: string
  icono: typeof Wallet
  negativo?: boolean
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
        <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
          <Icono className="size-[18px]" />
        </div>
      </div>

      <p
        className={`mt-3 text-xl font-bold tracking-tight ${
          negativo ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        {valor}
      </p>

      {nota && (
        <p className="mt-1 text-xs text-slate-400">{nota}</p>
      )}
    </div>
  )
}

export function InicioPage() {
  const datos = useDatosFinancieros()
  const stats = useProductStats()
  const [periodo, setPeriodo] = useState(periodoActual())

  if (datos === undefined) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    )
  }

  const resumen = resumenDelMes(datos, periodo)
  const flujo = flujoDelMes(datos, periodo)
  const valores = stats ? Array.from(stats.values()) : []
  const capital = valorInventario(valores)
  const negativas = valores.filter((s) => s.stock < 0).length
  const hoy = hoyLocal()

  const vencidas = datos.ventas.filter(
    (v) =>
      v.estado_cobro === 'pendiente' &&
      v.fecha_liberacion_estimada !== null &&
      v.fecha_liberacion_estimada < hoy,
  ).length

  const serie = ultimosPeriodos(periodo, 6).map((p) => ({
    mes: etiquetaMesCorta(p),
    utilidad: resumenDelMes(datos, p).utilidadNeta,
  }))

  const hayDatos =
    datos.ventas.length +
      datos.compras.length +
      datos.gastos.length +
      datos.anuncios.length >
    0

  const utilidadNegativa = resumen.utilidadNeta < 0
  const flujoNegativo = flujo.flujoNeto < 0

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-8 pt-5">
      {/* Encabezado */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
            VENDORA
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Inicio
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Resumen de tu negocio
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <SyncStatus />
        </div>
      </header>

      {/* Selector de periodo */}
      <div className="mt-6">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      {/* Estado vacío */}
      {!hayDatos && (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Package className="size-6" />
          </div>

          <p className="mt-3 font-semibold text-slate-900">
            Tu negocio está listo para comenzar
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Registra tu primera compra o venta para ver tus resultados aquí.
          </p>

          <div className="mt-5 flex justify-center gap-3">
            <Link
              to="/inventario/compras/nueva"
              className="rounded-xl bg-[#172554] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243b75]"
            >
              Nueva compra
            </Link>
            <Link
              to="/ventas/nueva"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Nueva venta
            </Link>
          </div>
        </div>
      )}

      {/* Alertas */}
      {(vencidas > 0 || negativas > 0) && (
        <div className="mt-5 space-y-2">
          {vencidas > 0 && (
            <Link
              to="/ventas"
              className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 transition hover:bg-rose-100"
            >
              <span className="flex items-center gap-2">
                <TriangleAlert className="size-4 shrink-0" />
                <span>
                  {vencidas}{' '}
                  {vencidas === 1
                    ? 'venta debió liberarse y sigue pendiente'
                    : 'ventas debieron liberarse y siguen pendientes'}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0" />
            </Link>
          )}

          {negativas > 0 && (
            <Link
              to="/inventario"
              className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 transition hover:bg-rose-100"
            >
              <span className="flex items-center gap-2">
                <TriangleAlert className="size-4 shrink-0" />
                <span>
                  {negativas}{' '}
                  {negativas === 1
                    ? 'producto con existencias negativas'
                    : 'productos con existencias negativas'}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Utilidad principal */}
      <section className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] p-5 text-white shadow-lg shadow-indigo-950/10">
        <div className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-5 -top-9 size-32 rounded-full border border-white/10" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <TrendingUp className="size-4 text-violet-200" />
            </div>
            <p className="text-sm font-medium text-indigo-100">
              Utilidad neta del mes
            </p>
          </div>

          <p
            className={`mt-4 text-3xl font-bold tracking-tight ${
              utilidadNegativa ? 'text-rose-300' : 'text-white'
            }`}
          >
            {formatMXN(resumen.utilidadNeta)}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
              Resultado del periodo
            </span>
            {utilidadNegativa && (
              <span className="text-xs text-rose-200">
                Resultado negativo
              </span>
            )}
          </div>

          {resumen.ventasSinCosto > 0 && (
            <p className="mt-3 text-xs text-indigo-200">
              {resumen.ventasSinCosto} ventas con costo incompleto no entran
              en el cálculo.
            </p>
          )}
        </div>
      </section>

      {/* Métricas */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Resumen financiero
          </h2>
          <span className="text-xs text-slate-400">
            Este periodo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Tarjeta
            etiqueta="Ventas del mes"
            valor={formatMXN(resumen.ingresos)}
            icono={Wallet}
          />
          <Tarjeta
            etiqueta="Flujo del mes"
            valor={formatMXN(flujo.flujoNeto)}
            icono={TrendingUp}
            negativo={flujoNegativo}
          />
          <Tarjeta
            etiqueta="Pendiente de liberar"
            valor={formatMXN(flujo.pendiente)}
            icono={Clock3}
          />
          <Tarjeta
            etiqueta="Capital en inventario"
            valor={formatMXN(capital)}
            icono={Package}
          />
        </div>
      </section>

      {/* Gráfica */}
      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Evolución de utilidad
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Últimos 6 meses
            </p>
          </div>

          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <TrendingUp className="size-[18px]" />
          </div>
        </div>

        <div className="mt-4">
          <GraficaUtilidad datos={serie} />
        </div>
      </section>

      {/* Accesos financieros */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-bold text-slate-900">
          Análisis financiero
        </h2>

        <div className="space-y-2">
          <Link
            to="/finanzas/flujo"
            className="group flex min-h-[68px] items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Wallet className="size-[19px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Flujo de efectivo
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Entradas y salidas de dinero
                </p>
              </div>
            </div>

            <ChevronRight className="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
          </Link>

          <Link
            to="/finanzas/rentabilidad"
            className="group flex min-h-[68px] items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <ArrowUpRight className="size-[19px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Rentabilidad por producto y canal
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Descubre qué productos generan más utilidad
                </p>
              </div>
            </div>

            <ChevronRight className="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
          </Link>
        </div>
      </section>
    </div>
  )
}

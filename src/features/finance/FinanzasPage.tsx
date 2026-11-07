
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeftRight,
  ChevronRight,
  Megaphone,
  TrendingUp,
  Wallet,
  ReceiptText,
  ChartNoAxesCombined,
  ShoppingCart,
  AlertCircle,
  CircleDollarSign,
} from 'lucide-react'

import { NavegadorMes } from '@/components/NavegadorMes'
import { periodoActual } from '@/lib/dates'
import { calcularResumen } from '@/lib/finanzas'
import { formatMXN } from '@/lib/money'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { useSync } from '@/features/sync/useSync'
import { agruparLineas } from '@/features/sales/pedidos'

function Linea({
  etiqueta,
  valor,
  clase = '',
}: {
  etiqueta: string
  valor: string
  clase?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${clase}`}>
      <span className="text-sm text-slate-500">{etiqueta}</span>
      <span className="text-sm font-medium tabular-nums text-slate-800">
        {valor}
      </span>
    </div>
  )
}

function AccesoFinanzas({
  to,
  icon: Icon,
  titulo,
  descripcion,
  valor,
}: {
  to: string
  icon: typeof Wallet
  titulo: string
  descripcion: string
  valor?: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/50"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:bg-violet-50 group-hover:text-violet-600">
          <Icon className="size-5" />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{titulo}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {descripcion}
          </p>
          {valor && (
            <p className="mt-1 text-xs font-semibold tabular-nums text-slate-700">
              {valor}
            </p>
          )}
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
    </Link>
  )
}

export function FinanzasPage() {
  const { db } = useSync()
  const [periodo, setPeriodo] = useState(periodoActual())

  const datos = useLiveQuery(async () => {
    const ventas = (await db.sales.toArray()).filter(
      (v) => v.deleted_at === null,
    )
    const items = (await db.sale_items.toArray()).filter(
      (i) => i.deleted_at === null,
    )
    const gastos = (await db.expenses.toArray()).filter(
      (g) => g.deleted_at === null,
    )
    const anuncios = (await db.ad_spends.toArray()).filter(
      (a) => a.deleted_at === null,
    )

    return { ventas, items, gastos, anuncios }
  }, [db])

  if (datos === undefined) {
    return (
      <div className="min-h-full bg-slate-50/70 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-52 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  const ventasMes = datos.ventas.filter((v) =>
    v.fecha.startsWith(periodo),
  )
  const gastosMes = datos.gastos.filter((g) =>
    g.fecha.startsWith(periodo),
  )
  const anunciosMes = datos.anuncios.filter((a) =>
    a.fecha.startsWith(periodo),
  )

  const lineas = agruparLineas(datos.items)

  const r = calcularResumen({
    pedidos: ventasMes.map((v) => ({
      lineas: lineas.get(v.id) ?? [],
      costo_envio: v.costo_envio,
      impuestos: v.impuestos,
    })),
    gastos: gastosMes.map((g) => g.monto),
    publicidad: anunciosMes.map((a) => a.monto),
  })

  const colorNeta =
    r.utilidadNeta < 0 ? 'text-rose-300' : 'text-emerald-300'

  const utilidadPositiva = r.utilidadNeta >= 0

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Encabezado */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <ChartNoAxesCombined className="size-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Finanzas
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                El estado financiero de tu negocio.
              </p>
            </div>
          </div>

          <SyncStatus />
        </div>

        {/* Periodo */}
        <div className="mb-5">
          <NavegadorMes periodo={periodo} onChange={setPeriodo} />
        </div>

        {/* Utilidad neta */}
        <section className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] p-5 text-white shadow-lg shadow-indigo-950/10 sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-8 size-40 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                <CircleDollarSign className="size-4 text-white/80" />
              </div>
              <p className="text-sm font-medium text-white/75">
                Utilidad neta del mes
              </p>
            </div>

            <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              <span className={colorNeta}>
                {formatMXN(r.utilidadNeta)}
              </span>
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
                  <AlertCircle className="size-3.5" />
                )}
                {utilidadPositiva ? 'Resultado positivo' : 'Resultado negativo'}
              </span>

              <span className="text-xs text-white/55">
                {ventasMes.length} {ventasMes.length === 1 ? 'pedido' : 'pedidos'} registrados
              </span>
            </div>
          </div>
        </section>

        {/* Desglose financiero */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Desglose financiero
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Cómo se compone tu resultado.
              </p>
            </div>

            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
              <ReceiptText className="size-4" />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <Linea
              etiqueta="Ingresos por ventas"
              valor={formatMXN(r.ingresos)}
            />

            <Linea
              etiqueta="Utilidad de las ventas"
              valor={formatMXN(r.utilidadVentas)}
            />

            <Linea
              etiqueta="Gastos operativos"
              valor={`−${formatMXN(r.gastos)}`}
            />

            <Linea
              etiqueta="Publicidad"
              valor={`−${formatMXN(r.publicidad)}`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
            <span className="text-sm font-bold text-slate-800">
              Utilidad neta
            </span>
            <span
              className={`text-base font-bold tabular-nums ${
                utilidadPositiva ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatMXN(r.utilidadNeta)}
            </span>
          </div>

          {r.ventasSinCosto > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-800">
                {r.ventasSinCosto}{' '}
                {r.ventasSinCosto === 1
                  ? 'venta sin costo no entra'
                  : 'ventas sin costo no entran'}{' '}
                a la utilidad.
              </p>
            </div>
          )}

          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            La utilidad no es dinero disponible: no incluye lo pendiente de
            liberar ni las compras de mercancía.
          </p>
        </section>

        {/* Accesos */}
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Administración financiera
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Consulta y administra cada parte de tus finanzas.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AccesoFinanzas
              to="/finanzas/gastos"
              icon={Wallet}
              titulo="Gastos"
              descripcion="Controla tus gastos operativos."
              valor={`${formatMXN(r.gastos)} este mes`}
            />

            <AccesoFinanzas
              to="/finanzas/publicidad"
              icon={Megaphone}
              titulo="Publicidad"
              descripcion="Mide tu inversión en anuncios."
              valor={`${formatMXN(r.publicidad)} este mes`}
            />

            <AccesoFinanzas
              to="/finanzas/flujo"
              icon={ArrowLeftRight}
              titulo="Flujo de efectivo"
              descripcion="Lo que entra y sale de verdad."
            />

            <AccesoFinanzas
              to="/finanzas/rentabilidad"
              icon={TrendingUp}
              titulo="Rentabilidad"
              descripcion="Analiza productos y canales."
            />
          </div>
        </section>

        {/* Nota */}
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-3">
          <ShoppingCart className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-500">
            Recuerda: las compras de mercancía representan inversión en
            inventario, no un gasto operativo. Para conocer tu dinero
            realmente disponible, consulta Flujo de efectivo.
          </p>
        </div>
      </div>
    </div>
  )
}

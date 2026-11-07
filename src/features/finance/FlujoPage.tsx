
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Clock,
  TrendingUp,
  TrendingDown,
  CircleHelp,
  ShoppingCart,
  ReceiptText,
  Megaphone,
  ArrowLeftRight,
  Info,
} from 'lucide-react'

import { NavegadorMes } from '@/components/NavegadorMes'
import { periodoActual } from '@/lib/dates'
import { formatMXN } from '@/lib/money'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { flujoDelMes, resumenDelMes } from './calculos'
import { useDatosFinancieros } from './useDatosFinancieros'

function Linea({
  etiqueta,
  valor,
  clase = '',
  icon: Icon,
}: {
  etiqueta: string
  valor: string
  clase?: string
  icon?: typeof Wallet
}) {
  return (
    <div className={`flex items-center justify-between gap-3 py-2 ${clase}`}>
      <span className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
        {Icon && <Icon className="size-4 shrink-0 text-slate-400" />}
        {etiqueta}
      </span>
      <span className="shrink-0 text-sm font-medium tabular-nums text-slate-800">
        {valor}
      </span>
    </div>
  )
}

export function FlujoPage() {
  const datos = useDatosFinancieros()
  const [periodo, setPeriodo] = useState(periodoActual())

  if (datos === undefined) {
    return (
      <div className="min-h-full bg-slate-50/70 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  const f = flujoDelMes(datos, periodo)
  const r = resumenDelMes(datos, periodo)

  const color = (n: number) =>
    n < 0 ? 'text-rose-600' : 'text-emerald-600'

  const flujoPositivo = f.flujoNeto >= 0

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
              <ArrowLeftRight className="size-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Flujo de efectivo
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">
                Controla el dinero que entra y sale de tu negocio.
              </p>
            </div>
          </div>

          <SyncStatus />
        </div>

        {/* Periodo */}
        <div className="mb-5">
          <NavegadorMes periodo={periodo} onChange={setPeriodo} />
        </div>

        {/* Flujo principal */}
        <section className="relative mb-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] p-5 text-white shadow-lg shadow-indigo-950/10 sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-4 -top-8 size-40 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
                <Wallet className="size-4 text-white/80" />
              </div>
              <p className="text-sm font-medium text-white/75">
                Flujo neto del mes
              </p>
            </div>

            <p
              className={`mt-4 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl ${
                flujoPositivo ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              {formatMXN(f.flujoNeto)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  flujoPositivo
                    ? 'bg-emerald-400/15 text-emerald-200'
                    : 'bg-rose-400/15 text-rose-200'
                }`}
              >
                {flujoPositivo ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {flujoPositivo ? 'Flujo positivo' : 'Flujo negativo'}
              </span>

              <span className="text-xs text-white/55">
                Entradas menos salidas
              </span>
            </div>
          </div>
        </section>

        {/* Entradas y salidas */}
        <section className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowDownLeft className="size-4" />
              </div>
              <p className="text-xs font-medium text-slate-500">
                Entradas
              </p>
            </div>

            <p className="mt-3 break-words text-lg font-bold tabular-nums text-emerald-600 sm:text-xl">
              {formatMXN(f.entradas)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Ventas liberadas
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <ArrowUpRight className="size-4" />
              </div>
              <p className="text-xs font-medium text-slate-500">
                Salidas
              </p>
            </div>

            <p className="mt-3 break-words text-lg font-bold tabular-nums text-rose-600 sm:text-xl">
              {formatMXN(f.salidas)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Compras y operaciones
            </p>
          </div>
        </section>

        {/* Desglose */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Desglose de movimientos
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Entradas y salidas registradas durante el mes.
              </p>
            </div>

            <div className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
              <ReceiptText className="size-4" />
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50/70 px-3 py-1">
            <Linea
              etiqueta="Ventas liberadas"
              valor={formatMXN(f.entradas)}
              clase="font-semibold"
              icon={ArrowDownLeft}
            />
          </div>

          <div className="my-3 border-t border-slate-100" />

          <div className="divide-y divide-slate-100">
            <Linea
              etiqueta="Compras de mercancía"
              valor={`−${formatMXN(f.compras)}`}
              icon={ShoppingCart}
            />

            <Linea
              etiqueta="Gastos operativos"
              valor={`−${formatMXN(f.gastos)}`}
              icon={ReceiptText}
            />

            <Linea
              etiqueta="Publicidad"
              valor={`−${formatMXN(f.publicidad)}`}
              icon={Megaphone}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
            <span className="text-sm font-bold text-slate-800">
              Total de salidas
            </span>
            <span className="text-sm font-bold tabular-nums text-rose-600">
              −{formatMXN(f.salidas)}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
            <span className="text-sm font-bold text-slate-800">
              Flujo neto del mes
            </span>
            <span className={`text-base font-bold tabular-nums ${color(f.flujoNeto)}`}>
              {formatMXN(f.flujoNeto)}
            </span>
          </div>
        </section>

        {/* Indicadores adicionales */}
        <section className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <TrendingUp className="size-4" />
              </div>
              <p className="text-xs font-medium text-slate-500">
                Flujo acumulado
              </p>
            </div>

            <p className={`mt-3 break-words text-lg font-bold tabular-nums sm:text-xl ${color(f.acumulado)}`}>
              {formatMXN(f.acumulado)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Hasta fin de este mes
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Clock className="size-4" />
              </div>
              <p className="text-xs font-medium text-slate-500">
                Pendiente de liberar
              </p>
            </div>

            <p className="mt-3 break-words text-lg font-bold tabular-nums text-slate-900 sm:text-xl">
              {formatMXN(f.pendiente)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Saldo pendiente hoy
            </p>
          </div>
        </section>

        {/* Utilidad vs efectivo */}
        <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CircleHelp className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Utilidad no es efectivo
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Dos indicadores diferentes de tu negocio.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <Linea
              etiqueta="Utilidad neta del mes"
              valor={formatMXN(r.utilidadNeta)}
              clase="font-semibold"
            />

            <Linea
              etiqueta="Flujo del mes"
              valor={formatMXN(f.flujoNeto)}
              clase="font-semibold"
            />
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="text-xs leading-relaxed text-slate-600">
              Pueden diferir porque la mercancía que compras y aún no vendes
              sale como efectivo, pero no como costo. Además, las ventas por
              liberar cuentan en la utilidad, pero todavía no entran al flujo.
            </p>
          </div>
        </section>

        {/* Nota contable */}
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-amber-800">
            Las compras se cuentan el día que las registras, incluso si las
            pagas con tarjeta de crédito. El acumulado parte de cuando
            empezaste a registrar: no representa el saldo de tu banco.
          </p>
        </div>
      </div>
    </div>
  )
}

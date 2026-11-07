import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { NavegadorMes } from '@/components/NavegadorMes'
import { periodoActual } from '@/lib/dates'
import { formatMXN } from '@/lib/money'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { flujoDelMes, resumenDelMes } from './calculos'
import { useDatosFinancieros } from './useDatosFinancieros'

function Linea({ etiqueta, valor, clase = '' }: { etiqueta: string; valor: string; clase?: string }) {
  return (
    <div className={`flex justify-between ${clase}`}>
      <span className="text-neutral-500">{etiqueta}</span>
      <span>{valor}</span>
    </div>
  )
}

export function FlujoPage() {
  const datos = useDatosFinancieros()
  const [periodo, setPeriodo] = useState(periodoActual())

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }

  const f = flujoDelMes(datos, periodo)
  const r = resumenDelMes(datos, periodo)
  const color = (n: number) => (n < 0 ? 'text-red-600' : 'text-emerald-600')

  return (
    <div className="px-4 pb-6 pt-4">
      <Link to="/finanzas" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Finanzas
      </Link>
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Flujo de efectivo</h1>
        <SyncStatus />
      </div>

      <div className="mt-4">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 p-4">
        <p className="text-xs text-neutral-500">Flujo del mes</p>
        <p className={`mt-1 text-2xl font-semibold ${color(f.flujoNeto)}`}>{formatMXN(f.flujoNeto)}</p>
      </div>

      <div className="mt-3 space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
        <Linea etiqueta="Entradas: ventas liberadas en el mes" valor={formatMXN(f.entradas)} clase="font-medium" />
        <div className="space-y-2 border-t border-neutral-200 pt-2">
          <Linea etiqueta="Compras de mercancía" valor={`−${formatMXN(f.compras)}`} />
          <Linea etiqueta="Gastos" valor={`−${formatMXN(f.gastos)}`} />
          <Linea etiqueta="Publicidad" valor={`−${formatMXN(f.publicidad)}`} />
          <Linea etiqueta="Salidas" valor={`−${formatMXN(f.salidas)}`} clase="font-medium" />
        </div>
        <div className="flex justify-between border-t border-neutral-200 pt-2 font-medium">
          <span>Flujo del mes</span>
          <span className={color(f.flujoNeto)}>{formatMXN(f.flujoNeto)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Flujo acumulado</p>
          <p className={`mt-1 text-lg font-semibold ${color(f.acumulado)}`}>{formatMXN(f.acumulado)}</p>
          <p className="mt-1 text-xs text-neutral-500">Hasta fin de este mes</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Pendiente de liberar</p>
          <p className="mt-1 text-lg font-semibold">{formatMXN(f.pendiente)}</p>
          <p className="mt-1 text-xs text-neutral-500">Hoy</p>
        </div>
      </div>

      <div className="mt-6 space-y-2 rounded-xl border border-neutral-200 p-4 text-sm">
        <p className="font-medium">Utilidad no es efectivo</p>
        <Linea etiqueta="Utilidad neta del mes" valor={formatMXN(r.utilidadNeta)} />
        <Linea etiqueta="Flujo del mes" valor={formatMXN(f.flujoNeto)} />
        <p className="text-xs text-neutral-500">
          Pueden diferir porque la mercancía que compras y aún no vendes sale como efectivo pero no como costo, y las
          ventas por liberar cuentan en la utilidad pero todavía no entran al flujo.
        </p>
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        Las compras se cuentan el día que las registras, incluso si las pagas con tarjeta de crédito. El acumulado parte
        de cuando empezaste a registrar: no es el saldo de tu banco.
      </p>
    </div>
  )
}
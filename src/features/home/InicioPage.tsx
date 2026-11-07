import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { NavegadorMes } from '@/components/NavegadorMes'
import { etiquetaMesCorta, hoyLocal, periodoActual, ultimosPeriodos } from '@/lib/dates'
import { valorInventario } from '@/lib/inventario'
import { formatMXN } from '@/lib/money'
import { flujoDelMes, resumenDelMes } from '@/features/finance/calculos'
import { useDatosFinancieros } from '@/features/finance/useDatosFinancieros'
import { useProductStats } from '@/features/purchases/useProductStats'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { GraficaUtilidad } from './GraficaUtilidad'

function Tarjeta({
  etiqueta,
  valor,
  clase = '',
  nota,
}: {
  etiqueta: string
  valor: string
  clase?: string
  nota?: string
}) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{etiqueta}</p>
      <p className={`mt-1 text-lg font-semibold ${clase}`}>{valor}</p>
      {nota && <p className="mt-1 text-xs text-neutral-500">{nota}</p>}
    </div>
  )
}

export function InicioPage() {
  const datos = useDatosFinancieros()
  const stats = useProductStats()
  const [periodo, setPeriodo] = useState(periodoActual())

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }

  const resumen = resumenDelMes(datos, periodo)
  const flujo = flujoDelMes(datos, periodo)
  const valores = stats ? Array.from(stats.values()) : []
  const capital = valorInventario(valores)
  const negativas = valores.filter((s) => s.stock < 0).length
  const hoy = hoyLocal()
  const vencidas = datos.ventas.filter(
    (v) => v.estado_cobro === 'pendiente' && v.fecha_liberacion_estimada !== null && v.fecha_liberacion_estimada < hoy,
  ).length
  const serie = ultimosPeriodos(periodo, 6).map((p) => ({
    mes: etiquetaMesCorta(p),
    utilidad: resumenDelMes(datos, p).utilidadNeta,
  }))
  const hayDatos =
    datos.ventas.length + datos.compras.length + datos.gastos.length + datos.anuncios.length > 0

  const color = (n: number) => (n < 0 ? 'text-red-600' : 'text-emerald-600')

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
        <SyncStatus />
      </div>

      <div className="mt-4">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      {!hayDatos && (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Aún no hay movimientos. Empieza registrando una compra o una venta.
          <div className="mt-3 flex justify-center gap-4">
            <Link to="/inventario/compras/nueva" className="underline">
              Nueva compra
            </Link>
            <Link to="/ventas/nueva" className="underline">
              Nueva venta
            </Link>
          </div>
        </div>
      )}

      {(vencidas > 0 || negativas > 0) && (
        <div className="mt-4 space-y-2">
          {vencidas > 0 && (
            <Link
              to="/ventas"
              className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span className="flex items-center gap-2">
                <TriangleAlert className="size-4" />
                {vencidas} {vencidas === 1 ? 'venta debió liberarse' : 'ventas debieron liberarse'} y sigue pendiente
              </span>
              <ChevronRight className="size-4" />
            </Link>
          )}
          {negativas > 0 && (
            <Link
              to="/inventario"
              className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span className="flex items-center gap-2">
                <TriangleAlert className="size-4" />
                {negativas} {negativas === 1 ? 'producto con existencias negativas' : 'productos con existencias negativas'}
              </span>
              <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-neutral-200 p-4">
        <p className="text-xs text-neutral-500">Utilidad neta del mes</p>
        <p className={`mt-1 text-2xl font-semibold ${color(resumen.utilidadNeta)}`}>{formatMXN(resumen.utilidadNeta)}</p>
        {resumen.ventasSinCosto > 0 && (
          <p className="mt-1 text-xs text-neutral-500">{resumen.ventasSinCosto} con costo incompleto no entran</p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tarjeta etiqueta="Ventas del mes" valor={formatMXN(resumen.ingresos)} />
        <Tarjeta etiqueta="Flujo del mes" valor={formatMXN(flujo.flujoNeto)} clase={color(flujo.flujoNeto)} />
        <Tarjeta etiqueta="Pendiente de liberar" valor={formatMXN(flujo.pendiente)} />
        <Tarjeta etiqueta="Capital en inventario" valor={formatMXN(capital)} />
      </div>

      <div className="mt-6 rounded-xl border border-neutral-200 p-4">
        <p className="text-sm font-medium">Utilidad neta, últimos 6 meses</p>
        <div className="mt-3">
          <GraficaUtilidad datos={serie} />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Link to="/finanzas/flujo" className="flex h-14 items-center justify-between rounded-xl border border-neutral-200 px-4">
          <span className="font-medium">Flujo de efectivo</span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>
        <Link to="/finanzas/rentabilidad" className="flex h-14 items-center justify-between rounded-xl border border-neutral-200 px-4">
          <span className="font-medium">Rentabilidad por producto y canal</span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>
      </div>
    </div>
  )
}
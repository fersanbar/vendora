import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Receipt } from 'lucide-react'
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

  const datos = useLiveQuery(async () => {
    const productos = new Map((await db.products.toArray()).map((p) => [p.id, p.nombre]))
    const canales = new Map((await db.channels.toArray()).map((c) => [c.id, c.nombre]))
    const ventas = (await db.sales.toArray()).filter((v) => v.deleted_at === null)
    const lineas = agruparLineas(await db.sale_items.toArray())
    return { productos, canales, ventas, lineas }
  }, [db])

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }

  const { productos, canales, ventas, lineas } = datos
  const hoy = hoyLocal()

  const calculos = ventas.map((venta) => {
    const ls = lineas.get(venta.id) ?? []
    return {
      venta,
      lineas: ls,
      c: calcularPedido({ lineas: ls, costo_envio: venta.costo_envio, impuestos: venta.impuestos }),
    }
  })

  const delMes = calculos
    .filter((x) => x.venta.fecha.startsWith(periodo))
    .sort((a, b) => b.venta.fecha.localeCompare(a.venta.fecha) || b.venta.created_at.localeCompare(a.venta.created_at))

  const ingresosMes = sumar(delMes.map((x) => x.c.ingreso))
  const utilidadMes = sumar(delMes.map((x) => x.c.utilidad ?? 0))
  const sinCosto = delMes.filter((x) => x.c.utilidad === null).length
  const pendiente = sumar(calculos.filter((x) => x.venta.estado_cobro === 'pendiente').map((x) => x.c.neto))

  async function liberar(id: string) {
    await markSaleReleased(db, id)
    void syncNow()
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <SyncStatus />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Ventas del mes</p>
          <p className="mt-1 text-lg font-semibold">{formatMXN(ingresosMes)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Utilidad del mes</p>
          <p className={`mt-1 text-lg font-semibold ${utilidadMes < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatMXN(utilidadMes)}
          </p>
          {sinCosto > 0 && <p className="mt-1 text-xs text-neutral-500">{sinCosto} con costo incompleto</p>}
        </div>
        <div className="col-span-2 rounded-xl border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Pendiente de liberar (todas las fechas)</p>
          <p className="mt-1 text-lg font-semibold">{formatMXN(pendiente)}</p>
        </div>
      </div>

      <div className="mt-6">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="mt-4 space-y-2">
        {delMes.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <Receipt className="mx-auto size-8 text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-500">Sin ventas en este mes.</p>
            <Button className="mt-4" onClick={() => navigate('/ventas/nueva')}>
              Registrar una venta
            </Button>
          </div>
        )}

        {delMes.map(({ venta: v, lineas: ls, c }) => {
          const pendienteCobro = v.estado_cobro === 'pendiente'
          const vencida = pendienteCobro && v.fecha_liberacion_estimada !== null && v.fecha_liberacion_estimada < hoy
          const textoEstado = pendienteCobro
            ? v.fecha_liberacion_estimada
              ? `${vencida ? 'Debía liberarse el' : 'Libera el'} ${formatearFecha(v.fecha_liberacion_estimada)}`
              : 'Pendiente'
            : `Liberado${v.fecha_liberacion_real ? ` el ${formatearFecha(v.fecha_liberacion_real)}` : ''}`
          const principal = c.utilidad ?? c.neto
          const primero = ls[0] ? (productos.get(ls[0].product_id) ?? 'Producto') : 'Sin productos'
          const titulo = ls.length > 1 ? `${primero} +${ls.length - 1} más` : primero

          return (
            <div key={v.id} className="flex items-center gap-2 rounded-xl border border-neutral-200 pr-3">
              <Link to={`/ventas/${v.id}`} className="flex min-h-16 flex-1 flex-col justify-center px-4 py-2">
                <span className="font-medium">{titulo}</span>
                <span className="text-xs text-neutral-500">
                  {canales.get(v.channel_id) ?? 'Canal'} · {formatearFecha(v.fecha)} · {c.piezas} pza
                </span>
                <span
                  className={`text-xs ${vencida ? 'text-red-600' : pendienteCobro ? 'text-neutral-500' : 'text-emerald-600'}`}
                >
                  {textoEstado}
                </span>
              </Link>
              <div className="flex flex-col items-end gap-1">
                <span className={`font-medium ${principal < 0 ? 'text-red-600' : c.utilidad !== null ? 'text-emerald-600' : ''}`}>
                  {formatMXN(principal)}
                </span>
                <span className="text-xs text-neutral-500">{c.utilidad !== null ? 'utilidad' : 'neto, sin costo'}</span>
                {pendienteCobro && (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => void liberar(v.id)}>
                    Liberado
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Button
        onClick={() => navigate('/ventas/nueva')}
        className="fixed right-4 z-20 size-14 rounded-full shadow-lg bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
        aria-label="Registrar venta"
      >
        <Plus className="size-6" />
      </Button>
    </div>
  )
}
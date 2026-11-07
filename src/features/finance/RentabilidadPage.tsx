import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NavegadorMes } from '@/components/NavegadorMes'
import { periodoActual } from '@/lib/dates'
import { calcularPedido, formatMXN } from '@/lib/money'
import { agregarPorCanal, agregarPorProducto, calcularLineasPedido } from '@/lib/rentabilidad'
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

export function RentabilidadPage() {
  const datos = useDatosFinancieros()
  const [periodo, setPeriodo] = useState(periodoActual())
  const [vista, setVista] = useState<Vista>('producto')

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }

  const ventasMes = datos.ventas.filter((v) => v.fecha.startsWith(periodo))
  const nombreProducto = new Map(datos.productos.map((p) => [p.id, p.nombre]))
  const nombreCanal = new Map(datos.canales.map((c) => [c.id, c.nombre]))

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
      return { channel_id: v.channel_id, ingreso: c.ingreso, neto: c.neto, utilidad: c.utilidad, piezas: c.piezas }
    }),
  ).sort((a, b) => porUtilidad(a.utilidad, b.utilidad))

  const color = (n: number) => (n < 0 ? 'text-red-600' : 'text-emerald-600')

  return (
    <div className="px-4 pb-6 pt-4">
      <Link to="/finanzas" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Finanzas
      </Link>
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rentabilidad</h1>
        <SyncStatus />
      </div>

      <div className="mt-4">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {(['producto', 'canal'] as const).map((v) => (
          <Button
            key={v}
            type="button"
            variant={vista === v ? 'default' : 'outline'}
            className="h-11"
            onClick={() => setVista(v)}
          >
            {v === 'producto' ? 'Por producto' : 'Por canal'}
          </Button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {ventasMes.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            Sin ventas en este mes.
          </div>
        )}

        {vista === 'producto' &&
          porProducto.map((p) => (
            <div key={p.product_id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <div>
                <p className="font-medium">{nombreProducto.get(p.product_id) ?? 'Producto'}</p>
                <p className="text-xs text-neutral-500">
                  {p.piezas} pza · ventas {formatMXN(p.ingreso)}
                </p>
                {p.lineasSinCosto > 0 && p.utilidad !== null && (
                  <p className="text-xs text-neutral-500">{p.lineasSinCosto} sin costo no cuentan</p>
                )}
              </div>
              <div className="text-right">
                {p.utilidad === null ? (
                  <p className="text-sm text-neutral-500">Sin costo</p>
                ) : (
                  <>
                    <p className={`font-medium ${color(p.utilidad)}`}>{formatMXN(p.utilidad)}</p>
                    <p className="text-xs text-neutral-500">
                      {p.roiPct === null ? '—' : `ROI ${p.roiPct}%`}
                      {p.margenPct === null ? '' : ` · margen ${p.margenPct}%`}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}

        {vista === 'canal' &&
          porCanal.map((c) => (
            <div key={c.channel_id} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <div>
                <p className="font-medium">{nombreCanal.get(c.channel_id) ?? 'Canal'}</p>
                <p className="text-xs text-neutral-500">
                  {c.pedidos} {c.pedidos === 1 ? 'pedido' : 'pedidos'} · ventas {formatMXN(c.ingreso)}
                </p>
                {c.pedidosSinCosto > 0 && c.utilidad !== null && (
                  <p className="text-xs text-neutral-500">{c.pedidosSinCosto} con costo incompleto no cuentan</p>
                )}
              </div>
              <div className="text-right">
                {c.utilidad === null ? (
                  <p className="text-sm text-neutral-500">Sin costo</p>
                ) : (
                  <>
                    <p className={`font-medium ${color(c.utilidad)}`}>{formatMXN(c.utilidad)}</p>
                    <p className="text-xs text-neutral-500">{c.margenPct === null ? '—' : `margen ${c.margenPct}%`}</p>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        {vista === 'producto'
          ? 'Cada producto recibe una parte del envío y de los impuestos del pedido, en proporción a su ingreso.'
          : 'Por canal se cuentan pedidos completos: los que tienen costo incompleto no entran a la utilidad.'}
      </p>
    </div>
  )
}
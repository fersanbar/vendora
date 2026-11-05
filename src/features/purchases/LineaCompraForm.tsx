import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Campo } from '@/components/Campo'
import type { LocalProduct } from '@/lib/db'
import { formatMXN, parseCantidad, parseCosto, totalLinea } from '@/lib/money'
import type { ProductoStats } from './useProductStats'

export interface LineaEstado {
  key: string
  id?: string
  product_id: string
  cantidad: number
  costo_unitario: number
}

interface Props {
  productos: LocalProduct[]
  stats: Map<string, ProductoStats> | undefined
  linea: LineaEstado | null
  onSave: (linea: LineaEstado) => void
}

export function LineaCompraForm({ productos, stats, linea, onSave }: Props) {
  const [productoId, setProductoId] = useState(linea?.product_id ?? '')
  const [busqueda, setBusqueda] = useState('')
  const [cantidad, setCantidad] = useState(linea ? String(linea.cantidad) : '1')
  const [costo, setCosto] = useState(linea ? String(linea.costo_unitario) : '')
  const [error, setError] = useState<string | null>(null)

  const activos = productos.filter((p) => p.deleted_at === null)
  const producto = productos.find((p) => p.id === productoId)
  const q = busqueda.trim().toLowerCase()
  const resultados = activos
    .filter((p) => q === '' || [p.nombre, p.sku, p.codigo_barras].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 20)

  const ultimo = productoId ? (stats?.get(productoId)?.ultimoCosto ?? null) : null
  const cantidadN = parseCantidad(cantidad)
  const costoN = parseCosto(costo)

  function elegir(p: LocalProduct) {
    setProductoId(p.id)
    const ultimoCosto = stats?.get(p.id)?.ultimoCosto ?? null
    if (costo === '' && ultimoCosto !== null) setCosto(String(ultimoCosto))
  }

  function guardar() {
    if (!productoId) {
      setError('Elige un producto.')
      return
    }
    if (cantidadN === null) {
      setError('La cantidad debe ser un entero mayor a 0.')
      return
    }
    if (costoN === null) {
      setError('Revisa el costo: máximo 4 decimales.')
      return
    }
    onSave({
      key: linea?.key ?? crypto.randomUUID(),
      id: linea?.id,
      product_id: productoId,
      cantidad: cantidadN,
      costo_unitario: costoN,
    })
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="text-left">
        <DrawerTitle>{linea ? 'Editar producto' : 'Agregar producto'}</DrawerTitle>
        <DrawerDescription>El costo es lo que realmente pagaste por cada pieza.</DrawerDescription>
      </DrawerHeader>

      <div className="space-y-4 px-4 pb-6">
        {!producto ? (
          <div className="space-y-2">
            <Input
              value={busqueda}
              placeholder="Buscar por nombre, SKU o código"
              className="h-11"
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {activos.length === 0 && (
              <p className="text-sm text-neutral-500">Aún no tienes productos. Créalos primero en Inventario.</p>
            )}
            {resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => elegir(p)}
                className="flex min-h-12 w-full flex-col justify-center rounded-xl border border-neutral-200 px-4 py-2 text-left"
              >
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-neutral-500">{p.sku ?? 'Sin SKU'}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <span className="font-medium">{producto.nombre}</span>
              <button type="button" className="text-sm text-neutral-500 underline" onClick={() => setProductoId('')}>
                Cambiar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo id="cantidad" label="Cantidad" value={cantidad} onChange={setCantidad} maxLength={6} inputMode="numeric" />
              <Campo id="costo" label="Costo unitario (MXN)" value={costo} onChange={setCosto} maxLength={13} inputMode="decimal" />
            </div>

            {ultimo !== null && (
              <p className="text-xs text-neutral-500">Último costo: {formatMXN(ultimo)}</p>
            )}
            {cantidadN !== null && costoN !== null && (
              <p className="text-sm font-medium">Total de la línea: {formatMXN(totalLinea(cantidadN, costoN))}</p>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Button type="button" onClick={guardar} className="h-11 w-full">
              {linea ? 'Guardar cambios' : 'Agregar'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
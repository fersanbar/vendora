
import { useState } from 'react'
import {
  Check,
  ChevronRight,
  Package,
  Search,
  ShoppingBasket,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Campo } from '@/components/Campo'
import type { LocalProduct } from '@/lib/db'
import {
  formatMXN,
  parseCantidad,
  parseCosto,
  totalLinea,
} from '@/lib/money'
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

export function LineaCompraForm({
  productos,
  stats,
  linea,
  onSave,
}: Props) {
  const [productoId, setProductoId] = useState(linea?.product_id ?? '')
  const [busqueda, setBusqueda] = useState('')
  const [cantidad, setCantidad] = useState(
    linea ? String(linea.cantidad) : '1',
  )
  const [costo, setCosto] = useState(
    linea ? String(linea.costo_unitario) : '',
  )
  const [error, setError] = useState<string | null>(null)

  const activos = productos.filter((p) => p.deleted_at === null)
  const producto = productos.find((p) => p.id === productoId)

  const q = busqueda.trim().toLowerCase()

  const resultados = activos
    .filter(
      (p) =>
        q === '' ||
        [p.nombre, p.sku, p.codigo_barras].some((v) =>
          v?.toLowerCase().includes(q),
        ),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 20)

  const ultimo = productoId
    ? (stats?.get(productoId)?.ultimoCosto ?? null)
    : null

  const cantidadN = parseCantidad(cantidad)
  const costoN = parseCosto(costo)

  const total =
    cantidadN !== null && costoN !== null
      ? totalLinea(cantidadN, costoN)
      : null

  function elegir(p: LocalProduct) {
    setProductoId(p.id)
    setError(null)

    const ultimoCosto = stats?.get(p.id)?.ultimoCosto ?? null

    if (costo === '' && ultimoCosto !== null) {
      setCosto(String(ultimoCosto))
    }
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
      <DrawerHeader className="border-b border-slate-100 px-5 pb-4 pt-5 text-left">
        <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <ShoppingBasket className="size-5" />
        </div>

        <DrawerTitle className="text-xl font-bold tracking-tight text-slate-900">
          {linea ? 'Editar producto' : 'Agregar producto'}
        </DrawerTitle>

        <DrawerDescription className="text-sm leading-relaxed text-slate-500">
          Registra los productos que compraste y cuánto pagaste por cada pieza.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-5 px-5 pb-7 pt-5">
        {!producto ? (
          <>
            {/* Selección de producto */}
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Seleccionar producto
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Busca en tu catálogo de inventario.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                <Input
                  value={busqueda}
                  placeholder="Nombre, SKU o código de barras..."
                  className="h-12 rounded-xl border-slate-200 bg-white pl-10 text-sm placeholder:text-slate-400 focus-visible:ring-violet-500"
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              {activos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                  <Package className="mx-auto size-8 text-slate-300" />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    No tienes productos todavía
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Primero crea tus productos en la sección de Inventario.
                  </p>
                </div>
              ) : resultados.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-6 text-center">
                  <Search className="mx-auto size-6 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">
                    No encontramos coincidencias.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {resultados.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => elegir(p)}
                      className="group flex min-h-[66px] w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-3.5 py-3 text-left transition hover:border-violet-200 hover:bg-violet-50/40"
                    >
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-violet-100 group-hover:text-violet-600">
                        <Package className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {p.nombre}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-400">
                          {p.sku ? `SKU: ${p.sku}` : 'Sin SKU'}
                          {p.categoria ? ` · ${p.categoria}` : ''}
                        </p>
                      </div>

                      <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                    </button>
                  ))}
                </div>
              )}

              {resultados.length === 20 && (
                <p className="text-center text-[11px] text-slate-400">
                  Se muestran los primeros 20 resultados. Refina tu búsqueda
                  para encontrar otro producto.
                </p>
              )}
            </section>
          </>
        ) : (
          <>
            {/* Producto seleccionado */}
            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
                  <Package className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-violet-600">
                    Producto seleccionado
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
                    {producto.nombre}
                  </p>
                  {producto.sku && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      SKU: {producto.sku}
                    </p>
                  )}
                </div>

                <Check className="size-5 shrink-0 text-emerald-600" />
              </div>

              <button
                type="button"
                className="mt-3 w-full border-t border-violet-100 pt-2.5 text-left text-xs font-semibold text-violet-700 transition hover:text-violet-900"
                onClick={() => {
                  setProductoId('')
                  setError(null)
                }}
              >
                Cambiar producto
              </button>
            </div>

            {/* Cantidad y costo */}
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Detalles de compra
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Captura la cantidad y el costo real por unidad.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="cantidad"
                  label="Cantidad"
                  value={cantidad}
                  onChange={(v) => {
                    setCantidad(v)
                    setError(null)
                  }}
                  maxLength={6}
                  inputMode="numeric"
                />

                <Campo
                  id="costo"
                  label="Costo unitario (MXN)"
                  value={costo}
                  onChange={(v) => {
                    setCosto(v)
                    setError(null)
                  }}
                  maxLength={13}
                  inputMode="decimal"
                />
              </div>

              {ultimo !== null && (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      Último costo registrado
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-slate-700">
                    {formatMXN(ultimo)}
                  </span>
                </div>
              )}
            </section>

            {/* Total */}
            {total !== null && (
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] p-4 text-white shadow-lg shadow-violet-950/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white/70">
                    Total de esta línea
                  </span>
                  <Wallet className="size-4 text-white/60" />
                </div>

                <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
                  {formatMXN(total)}
                </p>

                <p className="mt-1 text-xs text-white/65">
                  {cantidadN} {cantidadN === 1 ? 'pieza' : 'piezas'} ×{' '}
                  {formatMXN(costoN!)} por unidad
                </p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"
              >
                {error}
              </div>
            )}

            <Button
              type="button"
              onClick={guardar}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#172554] via-[#202f69] to-[#6336a9] font-semibold text-white shadow-md shadow-violet-900/10 transition hover:brightness-110"
            >
              <Check className="mr-2 size-4" />
              {linea ? 'Guardar cambios' : 'Agregar a la compra'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

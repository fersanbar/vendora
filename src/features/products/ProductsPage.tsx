
import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowDownAZ,
  ArrowDownZA,
  ArrowRight,
  Boxes,
  Package,
  PackagePlus,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { useSync } from '@/features/sync/useSync'
import { ProductForm } from './ProductForm'
import { formatMXN } from '@/lib/money'
import { InventarioTabs } from '@/features/purchases/InventarioTabs'
import { useProductStats } from '@/features/purchases/useProductStats'
import { resolverCosto } from '@/features/purchases/costo'

export function ProductsPage() {
  const { db } = useSync()

  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<'asc' | 'desc'>('asc')
  const [abierto, setAbierto] = useState(false)

  const stats = useProductStats()

  const productos = useLiveQuery(
    async () =>
      (await db.products.toArray()).filter((p) => p.deleted_at === null),
    [db],
  )

  const q = busqueda.trim().toLowerCase()

  const visibles = (productos ?? [])
    .filter(
      (p) =>
        q === '' ||
        [p.nombre, p.sku, p.codigo_barras, p.categoria].some((v) =>
          v?.toLowerCase().includes(q),
        ),
    )
    .sort((a, b) =>
      orden === 'asc'
        ? a.nombre.localeCompare(b.nombre, 'es')
        : b.nombre.localeCompare(a.nombre, 'es'),
    )

  const totalProductos = productos?.length ?? 0
  const conCosto = (productos ?? []).filter((p) => {
    const s = stats?.get(p.id)
    return resolverCosto(s?.costoPromedio, p.costo_referencia).valor !== null
  }).length

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-28 pt-5">
      {/* Encabezado */}
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-sm">
              <Boxes className="size-5" />
            </div>
            <span className="text-xs font-bold tracking-[0.18em] text-slate-400">
              VENDORA
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            Inventario
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Administra tus productos y costos.
          </p>
        </div>

        <SyncStatus />
      </header>

      {/* Navegación */}
      <div className="mt-5">
        <InventarioTabs />
      </div>

      {/* Resumen */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Productos
            </span>
            <Package className="size-4 text-violet-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
            {productos === undefined ? '—' : totalProductos}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            En tu catálogo
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Con costo
            </span>
            <Wallet className="size-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
            {productos === undefined || stats === undefined ? '—' : conCosto}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Con referencia o compras
          </p>
        </div>
      </div>

      {/* Búsqueda y orden */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Catálogo de productos
          </h2>

          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-500">
            {productos === undefined
              ? '...'
              : `${visibles.length} de ${totalProductos}`}
          </span>
        </div>

        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

            <Input
              value={busqueda}
              placeholder="Buscar por nombre, SKU..."
              className="h-12 rounded-xl border-slate-200 bg-white pl-10 pr-10 text-sm shadow-sm shadow-slate-200/30 placeholder:text-slate-400 focus-visible:ring-violet-500"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setBusqueda(e.target.value)
              }
            />

            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setOrden((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            }
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm shadow-slate-200/30 transition hover:bg-slate-50"
            aria-label={orden === 'asc' ? 'Ordenar Z-A' : 'Ordenar A-Z'}
          >
            {orden === 'asc' ? (
              <ArrowDownAZ className="size-4 text-violet-600" />
            ) : (
              <ArrowDownZA className="size-4 text-violet-600" />
            )}
            <span>{orden === 'asc' ? 'A-Z' : 'Z-A'}</span>
          </button>
        </div>
      </section>

      {/* Lista */}
      <section className="mt-4 space-y-2.5">
        {productos === undefined && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[100px] animate-pulse rounded-2xl border border-slate-100 bg-white"
              />
            ))}
          </>
        )}

        {productos && productos.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
              <PackagePlus className="size-7" />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              Tu inventario está vacío
            </h3>

            <p className="mx-auto mt-1 max-w-[240px] text-sm leading-relaxed text-slate-500">
              Agrega tu primer producto para comenzar a controlar existencias,
              costos y rentabilidad.
            </p>

            <Button
              onClick={() => setAbierto(true)}
              className="mt-5 h-11 rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] px-5 font-semibold text-white"
            >
              <Plus className="mr-2 size-4" />
              Agregar producto
            </Button>
          </div>
        )}

        {productos && productos.length > 0 && visibles.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white px-6 py-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Search className="size-5" />
            </div>

            <h3 className="mt-3 text-sm font-bold text-slate-800">
              No encontramos productos
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              No hay resultados para "{busqueda}".
            </p>

            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="mt-3 text-sm font-semibold text-violet-600 hover:text-violet-700"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}

        {visibles.map((p) => {
          const s = stats?.get(p.id)
          const costo = resolverCosto(s?.costoPromedio, p.costo_referencia)
          const stock = s?.stock ?? 0

          return (
            <Link
              key={p.id}
              to={`/inventario/${p.id}`}
              className="group block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/30 transition duration-200 hover:-translate-y-0.5 hover:border-violet-100 hover:shadow-md hover:shadow-violet-900/5"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-violet-50 group-hover:text-violet-600">
                  <Package className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-slate-900">
                        {p.nombre}
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        {[p.sku, p.categoria].filter(Boolean).join(' · ') ||
                          'Sin SKU ni categoría'}
                      </p>
                    </div>

                    <ArrowRight className="mt-0.5 size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Boxes className="size-3.5 text-slate-400" />
                      <span className="text-xs text-slate-500">
                        Stock{' '}
                        <span className="font-semibold tabular-nums text-slate-700">
                          {stock}
                        </span>
                      </span>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5">
                      <Wallet className="size-3.5 shrink-0 text-slate-400" />

                      {costo.valor === null ? (
                        <span className="text-xs font-medium text-amber-600">
                          Sin costo registrado
                        </span>
                      ) : (
                        <span className="truncate text-xs text-slate-500">
                          {costo.origen === 'compras'
                            ? 'Costo promedio'
                            : 'Costo referencia'}{' '}
                          <span className="font-semibold tabular-nums text-slate-700">
                            {formatMXN(costo.valor)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </section>

      {/* Botón flotante */}
      {productos && productos.length > 0 && (
        <Button
          onClick={() => setAbierto(true)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-14 rounded-2xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] text-white shadow-lg shadow-violet-950/20 transition hover:scale-105 hover:brightness-110"
          aria-label="Agregar producto"
        >
          <Plus className="size-6" />
        </Button>
      )}

      {/* Drawer */}
      <Drawer open={abierto} onOpenChange={setAbierto}>
        <DrawerContent className="max-h-[90dvh]">
          <ProductForm
            key="nuevo"
            producto={null}
            onDone={() => setAbierto(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}

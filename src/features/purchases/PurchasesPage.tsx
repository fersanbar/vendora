
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowRight,
  CalendarDays,
  Package,
  Plus,
  ReceiptText,
  ShoppingBasket,
  Store,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatMXN, sumar, totalLinea } from '@/lib/money'
import { formatearFecha, hoyLocal } from '@/lib/dates'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { useSync } from '@/features/sync/useSync'
import { InventarioTabs } from './InventarioTabs'
import { etiquetaMetodo } from './metodos'

export function PurchasesPage() {
  const { db } = useSync()
  const navigate = useNavigate()

  const filas = useLiveQuery(async () => {
    const proveedores = new Map(
      (await db.suppliers.toArray()).map((s) => [s.id, s.nombre]),
    )

    const compras = (await db.purchases.toArray())
      .filter((c) => c.deleted_at === null)
      .sort(
        (a, b) =>
          b.fecha.localeCompare(a.fecha) ||
          b.created_at.localeCompare(a.created_at),
      )

    const items = (await db.purchase_items.toArray()).filter(
      (i) => i.deleted_at === null,
    )

    const porCompra = new Map<string, { piezas: number; montos: number[] }>()

    for (const i of items) {
      const acc = porCompra.get(i.purchase_id) ?? {
        piezas: 0,
        montos: [],
      }

      acc.piezas += i.cantidad
      acc.montos.push(totalLinea(i.cantidad, i.costo_unitario))
      porCompra.set(i.purchase_id, acc)
    }

    return compras.map((c) => {
      const acc = porCompra.get(c.id)

      return {
        compra: c,
        proveedor: c.supplier_id
          ? (proveedores.get(c.supplier_id) ?? null)
          : null,
        piezas: acc?.piezas ?? 0,
        total: sumar(acc?.montos ?? []),
      }
    })
  }, [db])

  const mes = hoyLocal().slice(0, 7)

  const comprasMes = (filas ?? []).filter((f) =>
    f.compra.fecha.startsWith(mes),
  )

  const totalMes = sumar(comprasMes.map((f) => f.total))
  const piezasMes = comprasMes.reduce((acc, f) => acc + f.piezas, 0)

  const totalHistorico = sumar((filas ?? []).map((f) => f.total))

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-28 pt-5">
      {/* Encabezado */}
      <header className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-sm">
              <ShoppingBasket className="size-5" />
            </div>

            <span className="text-xs font-bold tracking-[0.18em] text-slate-400">
              VENDORA
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            Inventario
          </h1>

          <p className="mt-0.5 text-sm text-slate-500">
            Controla tus compras y costos de adquisición.
          </p>
        </div>

        <SyncStatus />
      </header>

      {/* Navegación */}
      <div className="mt-5">
        <InventarioTabs />
      </div>

      {/* Resumen mensual */}
      <section className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] p-5 text-white shadow-lg shadow-violet-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-white/10">
              <Wallet className="size-4 text-white/80" />
            </div>

            <span className="text-sm font-medium text-white/75">
              Comprado este mes
            </span>
          </div>

          <CalendarDays className="size-5 text-white/50" />
        </div>

        <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
          {filas === undefined ? '—' : formatMXN(totalMes)}
        </p>

        <div className="mt-4 flex items-center gap-4 border-t border-white/15 pt-3">
          <div>
            <p className="text-[11px] text-white/55">Compras</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {filas === undefined ? '—' : comprasMes.length}
            </p>
          </div>

          <div className="h-7 w-px bg-white/15" />

          <div>
            <p className="text-[11px] text-white/55">Piezas adquiridas</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {filas === undefined ? '—' : piezasMes}
            </p>
          </div>
        </div>
      </section>

      {/* Resumen histórico */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/30">
          <div className="flex items-center gap-2">
            <ReceiptText className="size-4 text-violet-500" />
            <span className="text-xs font-medium text-slate-500">
              Compras registradas
            </span>
          </div>

          <p className="mt-2 text-xl font-bold tabular-nums text-slate-900">
            {filas === undefined ? '—' : filas.length}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Historial completo
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/30">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-emerald-600" />
            <span className="text-xs font-medium text-slate-500">
              Total histórico
            </span>
          </div>

          <p className="mt-2 truncate text-xl font-bold tabular-nums text-slate-900">
            {filas === undefined ? '—' : formatMXN(totalHistorico)}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Importe de compras
          </p>
        </div>
      </div>

      {/* Historial */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Historial de compras
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Consulta y edita tus adquisiciones.
            </p>
          </div>

          {filas && filas.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-500">
              {filas.length}
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {/* Skeleton */}
          {filas === undefined &&
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[100px] animate-pulse rounded-2xl border border-slate-100 bg-white"
              />
            ))}

          {/* Estado vacío */}
          {filas && filas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                <ShoppingBasket className="size-7" />
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Todavía no tienes compras
              </h3>

              <p className="mx-auto mt-1 max-w-[250px] text-sm leading-relaxed text-slate-500">
                Registra tus adquisiciones para actualizar el inventario y
                conocer el costo real de tus productos.
              </p>

              <Button
                className="mt-5 h-11 rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] px-5 font-semibold text-white"
                onClick={() => navigate('/inventario/compras/nueva')}
              >
                <Plus className="mr-2 size-4" />
                Registrar primera compra
              </Button>
            </div>
          )}

          {/* Registros */}
          {filas?.map((f) => (
            <Link
              key={f.compra.id}
              to={`/inventario/compras/${f.compra.id}`}
              className="group block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/30 transition duration-200 hover:-translate-y-0.5 hover:border-violet-100 hover:shadow-md hover:shadow-violet-900/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition group-hover:bg-violet-50 group-hover:text-violet-600">
                  <ShoppingBasket className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {f.proveedor ?? 'Sin proveedor'}
                    </p>

                    <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
                      {formatMXN(f.total)}
                    </p>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 shrink-0 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {formatearFecha(f.compra.fecha)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Package className="size-3.5 text-slate-400" />
                        {f.piezas} {f.piezas === 1 ? 'pieza' : 'piezas'}
                      </span>

                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Store className="size-3.5 text-slate-400" />
                        {etiquetaMetodo(f.compra.metodo_pago)}
                      </span>
                    </div>

                    <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Botón flotante */}
      {filas && filas.length > 0 && (
        <Button
          onClick={() => navigate('/inventario/compras/nueva')}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-14 rounded-2xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] text-white shadow-lg shadow-violet-950/20 transition hover:scale-105 hover:brightness-110"
          aria-label="Registrar compra"
        >
          <Plus className="size-6" />
        </Button>
      )}
    </div>
  )
}

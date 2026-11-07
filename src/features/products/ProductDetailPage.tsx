
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertCircle,
  ArrowDownRight,
  Boxes,
  CalendarDays,
  ChevronLeft,
  Clock3,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import type { LocalListing } from '@/lib/db'
import { formatearFecha } from '@/lib/dates'
import {
  calcularMargen,
  calcularNetoConImpuestos,
  formatMXN,
} from '@/lib/money'

import { ListingForm } from '@/features/listings/ListingForm'
import { resolverCosto } from '@/features/purchases/costo'
import { useProductStats } from '@/features/purchases/useProductStats'
import { AjusteStockForm } from '@/features/stock/AjusteStockForm'
import { ETIQUETA_MOTIVO } from '@/features/stock/motivos'
import { deleteAdjustment } from '@/features/stock/stock.repo'
import { useSync } from '@/features/sync/useSync'
import { useIvaGeneral } from '@/features/taxes/useIvaGeneral'
import { ProductForm } from './ProductForm'

function Indicador({
  etiqueta,
  valor,
  icon: Icon,
}: {
  etiqueta: string
  valor: string
  icon: LucideIcon
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="size-3.5 shrink-0" />
        <p className="truncate text-[11px]">{etiqueta}</p>
      </div>
      <p className="mt-1.5 truncate text-sm font-bold tabular-nums text-slate-800">
        {valor}
      </p>
    </div>
  )
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { db, syncNow } = useSync()
  const ivaGeneral = useIvaGeneral()
  const stats = useProductStats()

  const [editando, setEditando] = useState(false)
  const [ajusteAbierto, setAjusteAbierto] = useState(false)
  const [confirmandoAjuste, setConfirmandoAjuste] = useState<string | null>(null)
  const [listingAbierto, setListingAbierto] = useState(false)
  const [listingSel, setListingSel] = useState<LocalListing | null>(null)

  const datos = useLiveQuery(async () => {
    if (!id) return null

    const producto = (await db.products.get(id)) ?? null

    const listings = (
      await db.listings.where('product_id').equals(id).toArray()
    ).filter((l) => l.deleted_at === null)

    const ids = listings.map((l) => l.id)

    const impuestos = ids.length
      ? (
          await db.listing_taxes
            .where('listing_id')
            .anyOf(ids)
            .toArray()
        ).filter((i) => i.deleted_at === null)
      : []

    const canales = await db.channels.toArray()

    const tipos = (await db.tax_types.toArray()).filter(
      (t) => t.deleted_at === null,
    )

    const ajustes = (
      await db.stock_adjustments
        .where('product_id')
        .equals(id)
        .toArray()
    )
      .filter((a) => a.deleted_at === null)
      .sort(
        (a, b) =>
          b.fecha.localeCompare(a.fecha) ||
          b.created_at.localeCompare(a.created_at),
      )
      .slice(0, 10)

    return {
      producto,
      listings,
      impuestos,
      canales,
      tipos,
      ajustes,
    }
  }, [db, id])

  if (datos === undefined) {
    return (
      <div className="min-h-full bg-slate-50/70 px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  if (!datos || !datos.producto || datos.producto.deleted_at !== null) {
    return <Navigate to="/inventario" replace />
  }

  const {
    producto,
    listings,
    impuestos,
    canales,
    tipos,
    ajustes,
  } = datos

  const s = stats?.get(producto.id)
  const stockActual = s?.stock ?? 0
  const costo = resolverCosto(
    s?.costoPromedio,
    producto.costo_referencia,
  )
  const ultimoCosto = s?.ultimoCosto ?? null

  const nombreCanal = new Map(
    canales.map((c) => [c.id, c.nombre]),
  )

  const claveTipo = new Map(
    tipos.map((t) => [t.id, t.clave]),
  )

  const usados = new Set(listings.map((l) => l.channel_id))

  const opciones = canales.filter(
    (c) => c.activo && !usados.has(c.id),
  )

  const impuestosSel = listingSel
    ? impuestos.filter((i) => i.listing_id === listingSel.id)
    : []

  const tiposForm = tipos.filter(
    (t) =>
      t.activo ||
      impuestosSel.some((i) => i.tax_type_id === t.id),
  )

  function abrirListing(l: LocalListing | null) {
    setListingSel(l)
    setListingAbierto(true)
  }

  async function quitarAjuste(ajusteId: string) {
    await deleteAdjustment(db, ajusteId)
    setConfirmandoAjuste(null)
    void syncNow()
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Navegación */}
        <Link
          to="/inventario"
          className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-violet-600"
        >
          <ChevronLeft className="size-4" />
          Inventario
        </Link>

        {/* Encabezado */}
        <section className="mb-6 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Package className="size-6" />
            </div>

            <div className="min-w-0">
              <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">
                {producto.nombre}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {[producto.sku, producto.categoria]
                  .filter(Boolean)
                  .join(' · ') || 'Sin SKU ni categoría'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditando(true)}
            aria-label="Editar producto"
            className="size-10 shrink-0 rounded-xl border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            <Pencil className="size-4" />
          </Button>
        </section>

        {/* Indicadores de inventario */}
        <section className="mb-5 grid grid-cols-3 gap-2">
          <Indicador
            etiqueta="Existencias"
            valor={String(stockActual)}
            icon={Boxes}
          />

          <Indicador
            etiqueta={
              costo.origen === 'referencia'
                ? 'Costo de ref.'
                : 'Costo promedio'
            }
            valor={
              costo.valor !== null
                ? formatMXN(costo.valor)
                : '—'
            }
            icon={Wallet}
          />

          <Indicador
            etiqueta="Último costo"
            valor={
              ultimoCosto !== null
                ? formatMXN(ultimoCosto)
                : '—'
            }
            icon={ShoppingBag}
          />
        </section>

        {/* Estado de inventario */}
        <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">
                Control de existencias
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Registra entradas, pérdidas y correcciones de inventario.
              </p>
            </div>

            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="size-5" />
            </div>
          </div>

          <Button
            variant="outline"
            className="mt-4 h-11 w-full rounded-xl border-slate-200 font-semibold text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
            onClick={() => setAjusteAbierto(true)}
          >
            <Plus className="mr-2 size-4" />
            Ajustar existencias
          </Button>
        </section>

        {/* Ajustes recientes */}
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Movimientos de inventario
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Últimos 10 ajustes registrados.
              </p>
            </div>

            {ajustes.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {ajustes.length}
              </span>
            )}
          </div>

          {ajustes.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
              {ajustes.map((a, index) => {
                const positivo = a.cantidad > 0

                return (
                  <div
                    key={a.id}
                    className={`px-4 py-3 ${
                      index !== 0 ? 'border-t border-slate-100' : ''
                    }`}
                  >
                    {confirmandoAjuste === a.id ? (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <AlertCircle className="size-4 text-rose-500" />
                          ¿Borrar este ajuste?
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => setConfirmandoAjuste(null)}
                          >
                            Cancelar
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-lg"
                            onClick={() => void quitarAjuste(a.id)}
                          >
                            Borrar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                              positivo
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {positivo ? (
                              <ArrowDownRight className="size-4 rotate-180" />
                            ) : (
                              <ArrowDownRight className="size-4" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {ETIQUETA_MOTIVO[a.motivo]}
                            </p>

                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                              <CalendarDays className="size-3" />
                              {formatearFecha(a.fecha)}

                              {a.costo_unitario !== null && (
                                <>
                                  <span>·</span>
                                  Costo {formatMXN(a.costo_unitario)}
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              positivo
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {positivo ? '+' : ''}
                            {a.cantidad} pza
                          </span>

                          <button
                            type="button"
                            aria-label="Borrar ajuste"
                            onClick={() => setConfirmandoAjuste(a.id)}
                            className="flex size-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                <Boxes className="size-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Sin movimientos registrados
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Los ajustes de existencias aparecerán aquí.
              </p>
            </div>
          )}
        </section>

        {/* Publicaciones */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Publicaciones
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Precios, tarifas y rentabilidad por canal.
              </p>
            </div>

            <Button
              size="sm"
              disabled={opciones.length === 0}
              onClick={() => abrirListing(null)}
              className="h-9 shrink-0 rounded-xl bg-[#172554] px-3 text-white hover:bg-[#263b78]"
            >
              <Plus className="mr-1.5 size-4" />
              Agregar
            </Button>
          </div>

          {canales.length === 0 && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <Store className="mt-0.5 size-4 shrink-0 text-blue-600" />
              <p className="text-xs leading-relaxed text-blue-800">
                Aún no hay canales en tu teléfono. Conéctate a internet una vez
                o agrégalos en Más → Canales de venta.
              </p>
            </div>
          )}

          {canales.length > 0 && opciones.length === 0 && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">
                Este producto ya está en todos tus canales activos.
              </p>
            </div>
          )}

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                <Store className="size-6" />
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-800">
                Sin publicaciones todavía
              </h3>

              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                Publica este producto en tus canales para calcular su neto,
                utilidad y ROI.
              </p>

              {opciones.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => abrirListing(null)}
                  className="mt-4 rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] text-white hover:brightness-110"
                >
                  <Plus className="mr-2 size-4" />
                  Crear publicación
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {listings.map((l) => {
                const delListing = impuestos.filter(
                  (i) => i.listing_id === l.id,
                )

                const aplicaIva = delListing.some(
                  (i) => claveTipo.get(i.tax_type_id) === 'iva',
                )

                const { neto } = calcularNetoConImpuestos(
                  l.precio_venta,
                  l.comision_pct,
                  l.cargo_fijo,
                  l.costo_envio,
                  ivaGeneral,
                  aplicaIva,
                  delListing.map((i) => i.tasa_pct),
                )

                const resultado =
                  costo.valor !== null
                    ? calcularMargen(l.precio_venta, neto, costo.valor)
                    : null

                const roiNegativo =
                  resultado?.roiPct != null && resultado.roiPct < 0

                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => abrirListing(l)}
                    className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm shadow-slate-200/30 transition hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-100">
                          <Store className="size-5" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {nombreCanal.get(l.channel_id) ?? 'Canal'}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Precio {formatMXN(l.precio_venta)}
                          </p>

                          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock3 className="size-3" />
                            Libera en {l.dias_liberacion} días
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={`text-base font-bold tabular-nums ${
                            neto < 0
                              ? 'text-rose-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {formatMXN(neto)}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Neto por venta
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {resultado?.roiPct != null ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              roiNegativo
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {roiNegativo ? (
                              <TrendingUp className="size-3.5 rotate-180" />
                            ) : (
                              <TrendingUp className="size-3.5" />
                            )}
                            ROI {resultado.roiPct}%
                            {costo.origen === 'referencia' && ' est.'}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                            Sin costo disponible
                          </span>
                        )}

                        {resultado && (
                          <span className="text-xs text-slate-500">
                            Utilidad{' '}
                            <span
                              className={`font-semibold ${
                                resultado.utilidad < 0
                                  ? 'text-rose-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {formatMXN(resultado.utilidad)}
                            </span>
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-medium text-violet-600 transition group-hover:translate-x-0.5">
                        Editar
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* Modales */}
        <Drawer open={editando} onOpenChange={setEditando}>
          <DrawerContent>
            <ProductForm
              key={producto.id}
              producto={producto}
              onDone={() => setEditando(false)}
            />
          </DrawerContent>
        </Drawer>

        <Drawer open={ajusteAbierto} onOpenChange={setAjusteAbierto}>
          <DrawerContent>
            <AjusteStockForm
              producto={producto}
              stockActual={stockActual}
              costoSugerido={costo.valor}
              onDone={() => setAjusteAbierto(false)}
            />
          </DrawerContent>
        </Drawer>

        <Drawer open={listingAbierto} onOpenChange={setListingAbierto}>
          <DrawerContent>
            <ListingForm
              key={listingSel?.id ?? 'nueva'}
              productId={producto.id}
              costoReferencia={producto.costo_referencia ?? null}
              listing={listingSel}
              opciones={opciones}
              canalNombre={
                listingSel
                  ? (nombreCanal.get(listingSel.channel_id) ?? null)
                  : null
              }
              tiposImpuesto={tiposForm}
              impuestosActuales={impuestosSel}
              onDone={() => setListingAbierto(false)}
            />
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}

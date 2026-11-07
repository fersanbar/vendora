import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import type { LocalListing } from '@/lib/db'
import { formatearFecha } from '@/lib/dates'
import { calcularMargen, calcularNetoConImpuestos, formatMXN } from '@/lib/money'
import { ListingForm } from '@/features/listings/ListingForm'
import { resolverCosto } from '@/features/purchases/costo'
import { useProductStats } from '@/features/purchases/useProductStats'
import { AjusteStockForm } from '@/features/stock/AjusteStockForm'
import { ETIQUETA_MOTIVO } from '@/features/stock/motivos'
import { deleteAdjustment } from '@/features/stock/stock.repo'
import { useSync } from '@/features/sync/useSync'
import { useIvaGeneral } from '@/features/taxes/useIvaGeneral'
import { ProductForm } from './ProductForm'

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
    const listings = (await db.listings.where('product_id').equals(id).toArray()).filter(
      (l) => l.deleted_at === null,
    )
    const ids = listings.map((l) => l.id)
    const impuestos = ids.length
      ? (await db.listing_taxes.where('listing_id').anyOf(ids).toArray()).filter((i) => i.deleted_at === null)
      : []
    const canales = await db.channels.toArray()
    const tipos = (await db.tax_types.toArray()).filter((t) => t.deleted_at === null)
    const ajustes = (await db.stock_adjustments.where('product_id').equals(id).toArray())
      .filter((a) => a.deleted_at === null)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))
      .slice(0, 10)
    return { producto, listings, impuestos, canales, tipos, ajustes }
  }, [db, id])

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }
  if (!datos || !datos.producto || datos.producto.deleted_at !== null) {
    return <Navigate to="/inventario" replace />
  }

  const { producto, listings, impuestos, canales, tipos, ajustes } = datos
  const s = stats?.get(producto.id)
  const stockActual = s?.stock ?? 0
  const costo = resolverCosto(s?.costoPromedio, producto.costo_referencia)
  const ultimoCosto = s?.ultimoCosto ?? null

  const nombreCanal = new Map(canales.map((c) => [c.id, c.nombre]))
  const claveTipo = new Map(tipos.map((t) => [t.id, t.clave]))
  const usados = new Set(listings.map((l) => l.channel_id))
  const opciones = canales.filter((c) => c.activo && !usados.has(c.id))

  const impuestosSel = listingSel ? impuestos.filter((i) => i.listing_id === listingSel.id) : []
  const tiposForm = tipos.filter((t) => t.activo || impuestosSel.some((i) => i.tax_type_id === t.id))

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
    <div className="px-4 pb-6 pt-4">
      <Link to="/inventario" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Inventario
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{producto.nombre}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {[producto.sku, producto.categoria].filter(Boolean).join(' · ') || 'Sin SKU ni categoría'}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setEditando(true)} aria-label="Editar producto">
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          ['Existencias', String(stockActual)],
          [costo.origen === 'referencia' ? 'Costo de ref.' : 'Costo promedio', costo.valor !== null ? formatMXN(costo.valor) : '—'],
          ['Último costo', ultimoCosto !== null ? formatMXN(ultimoCosto) : '—'],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-xl border border-neutral-200 p-3">
            <p className="text-xs text-neutral-500">{etiqueta}</p>
            <p className="mt-1 text-sm font-semibold">{valor}</p>
          </div>
        ))}
      </div>

      <Button variant="outline" className="mt-3 h-11 w-full" onClick={() => setAjusteAbierto(true)}>
        Ajustar existencias
      </Button>

      {ajustes.length > 0 && (
        <div className="mt-4 space-y-1">
          <p className="text-sm font-medium text-neutral-500">Ajustes recientes</p>
          {ajustes.map((a) =>
            confirmandoAjuste === a.id ? (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-4 py-2">
                <span className="text-sm">¿Borrar este ajuste?</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setConfirmandoAjuste(null)}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void quitarAjuste(a.id)}>
                    Borrar
                  </Button>
                </div>
              </div>
            ) : (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-neutral-200 pl-4 pr-1">
                <div className="py-2">
                  <p className="text-sm font-medium">
                    {a.cantidad > 0 ? '+' : ''}
                    {a.cantidad} pza · {ETIQUETA_MOTIVO[a.motivo]}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatearFecha(a.fecha)}
                    {a.costo_unitario !== null ? ` · costo ${formatMXN(a.costo_unitario)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Borrar ajuste"
                  onClick={() => setConfirmandoAjuste(a.id)}
                  className="flex size-10 items-center justify-center text-neutral-400"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ),
          )}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-medium">Publicaciones</h2>
        <Button size="sm" disabled={opciones.length === 0} onClick={() => abrirListing(null)}>
          <Plus className="mr-1 size-4" />
          Agregar a un canal
        </Button>
      </div>

      {canales.length === 0 && (
        <p className="mt-3 text-sm text-neutral-500">
          Aún no hay canales en tu teléfono. Conéctate a internet una vez, o agrégalos en Más → Canales de venta.
        </p>
      )}
      {canales.length > 0 && opciones.length === 0 && (
        <p className="mt-3 text-sm text-neutral-500">Este producto ya está en todos tus canales activos.</p>
      )}

      <div className="mt-3 space-y-2">
        {listings.length === 0 && canales.length > 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Aún no está publicado en ningún canal.
          </div>
        )}

        {listings.map((l) => {
          const delListing = impuestos.filter((i) => i.listing_id === l.id)
          const aplicaIva = delListing.some((i) => claveTipo.get(i.tax_type_id) === 'iva')
          const { neto } = calcularNetoConImpuestos(
            l.precio_venta,
            l.comision_pct,
            l.cargo_fijo,
            l.costo_envio,
            ivaGeneral,
            aplicaIva,
            delListing.map((i) => i.tasa_pct),
          )
          const resultado = costo.valor !== null ? calcularMargen(l.precio_venta, neto, costo.valor) : null
          return (
            <button
              key={l.id}
              onClick={() => abrirListing(l)}
              className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium">{nombreCanal.get(l.channel_id) ?? 'Canal'}</p>
                <p className="text-xs text-neutral-500">
                  Precio {formatMXN(l.precio_venta)} · libera en {l.dias_liberacion} días
                </p>
              </div>
              <div className="text-right">
                <p className={`font-medium ${neto < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatMXN(neto)}
                </p>
                <p className="text-xs text-neutral-500">neto</p>
                {resultado?.roiPct != null && (
                  <p className="text-xs text-neutral-500">
                    ROI {resultado.roiPct}%{costo.origen === 'referencia' ? ' (est.)' : ''}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <Drawer open={editando} onOpenChange={setEditando}>
        <DrawerContent>
          <ProductForm key={producto.id} producto={producto} onDone={() => setEditando(false)} />
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
            canalNombre={listingSel ? (nombreCanal.get(listingSel.channel_id) ?? null) : null}
            tiposImpuesto={tiposForm}
            impuestosActuales={impuestosSel}
            onDone={() => setListingAbierto(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}
import { useState, type ChangeEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type {
  LocalChannel,
  LocalListing,
  LocalListingTax,
  LocalProduct,
  LocalSale,
  LocalSaleItem,
  LocalTaxType,
} from '@/lib/db'
import { hoyLocal, sumarDias } from '@/lib/dates'
import { calcularPedido, formatMXN, parseMonto, sumar, totalLinea } from '@/lib/money'
import { useProductStats } from '@/features/purchases/useProductStats'
import { useSync } from '@/features/sync/useSync'
import { useIvaGeneral } from '@/features/taxes/useIvaGeneral'
import { LineaVentaForm, type LineaVentaEstado } from './LineaVentaForm'
import { deleteSale, saveSale } from './sales.repo'
import { contextoPublicacion, sugerirLinea } from './sugerencia'

type CamposPedido = 'envio' | 'impuestos' | 'liberacion'

interface Props {
  venta: LocalSale | null
  items: LocalSaleItem[]
  productos: LocalProduct[]
  canales: LocalChannel[]
  listings: LocalListing[]
  listingTaxes: LocalListingTax[]
  tipos: LocalTaxType[]
}

function Linea({ etiqueta, valor, clase = 'text-neutral-500' }: { etiqueta: string; valor: string; clase?: string }) {
  return (
    <div className={`flex justify-between ${clase}`}>
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </div>
  )
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

function SaleForm({ venta, items, productos, canales, listings, listingTaxes, tipos }: Props) {
  const { db, syncNow } = useSync()
  const navigate = useNavigate()
  const stats = useProductStats()
  const ivaGeneral = useIvaGeneral()

  const canalesVisibles = canales
    .filter((c) => c.activo || c.id === venta?.channel_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const [canalId, setCanalId] = useState(venta?.channel_id ?? canalesVisibles[0]?.id ?? '')
  const [fecha, setFecha] = useState(venta?.fecha ?? hoyLocal())
  const [lineas, setLineas] = useState<LineaVentaEstado[]>(() =>
    items.map((i) => {
      const ctx = contextoPublicacion(i.product_id, venta?.channel_id ?? '', listings, listingTaxes, tipos)
      const s = sugerirLinea({
        ...ctx,
        ivaGeneral,
        cantidad: i.cantidad,
        precioUnitario: i.precio_unitario,
      })
      return {
        key: i.id,
        id: i.id,
        product_id: i.product_id,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        comision: i.comision,
        cargo_fijo: i.cargo_fijo,
        costo_unitario: i.costo_unitario,
        impuestoSugerido: s.impuestos,
        envioReferencia: s.envio,
        diasLiberacion: s.dias,
      }
    }),
  )
  const [ov, setOv] = useState<Partial<Record<CamposPedido, string>>>(() =>
    venta
      ? {
          envio: String(venta.costo_envio),
          impuestos: String(venta.impuestos),
          liberacion: venta.fecha_liberacion_estimada ?? '',
        }
      : {},
  )
  const [estado, setEstado] = useState<LocalSale['estado_cobro']>(venta?.estado_cobro ?? 'pendiente')
  const [fechaReal, setFechaReal] = useState(venta?.fecha_liberacion_real ?? hoyLocal())
  const [idOrden, setIdOrden] = useState(venta?.id_orden ?? '')
  const [notas, setNotas] = useState(venta?.notas ?? '')
  const [lineaAbierta, setLineaAbierta] = useState(false)
  const [lineaSel, setLineaSel] = useState<LineaVentaEstado | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function poner(campo: CamposPedido, valor: string) {
    setOv((prev) => ({ ...prev, [campo]: valor }))
  }

  function abrirLinea(l: LineaVentaEstado | null) {
    setLineaSel(l)
    setLineaAbierta(true)
  }

  function guardarLinea(l: LineaVentaEstado) {
    setLineas((prev) => (prev.some((x) => x.key === l.key) ? prev.map((x) => (x.key === l.key ? l : x)) : [...prev, l]))
    setLineaAbierta(false)
  }

  // Envío: una sola vez por pedido. Con varios productos se toma el mayor de las publicaciones.
  const envioTxt = ov.envio ?? String(lineas.reduce((max, l) => Math.max(max, l.envioReferencia), 0))
  const impuestosTxt = ov.impuestos ?? String(sumar(lineas.map((l) => l.impuestoSugerido)))
  const dias = lineas.reduce((max, l) => Math.max(max, l.diasLiberacion), 0)
  const liberacionTxt = ov.liberacion ?? (lineas.length > 0 && FECHA.test(fecha) ? sumarDias(fecha, dias) : '')

  const envioN = parseMonto(envioTxt)
  const impuestosN = parseMonto(impuestosTxt)

  const calculo =
    lineas.length > 0 && envioN !== null && impuestosN !== null
      ? calcularPedido({ lineas, costo_envio: envioN, impuestos: impuestosN })
      : null

  const nombres = new Map(productos.map((p) => [p.id, p.nombre]))
  const pedido = new Map<string, number>()
  for (const l of lineas) pedido.set(l.product_id, (pedido.get(l.product_id) ?? 0) + l.cantidad)
  const propias = new Map<string, number>()
  for (const i of items) propias.set(i.product_id, (propias.get(i.product_id) ?? 0) + i.cantidad)
  const disponible = (productId: string) => (stats?.get(productId)?.stock ?? 0) + (propias.get(productId) ?? 0)

  async function guardar() {
    if (!canalId) return setError('Elige un canal.')
    if (!FECHA.test(fecha)) return setError('Elige la fecha de la venta.')
    if (lineas.length === 0) return setError('Agrega al menos un producto.')
    if (envioN === null || impuestosN === null) return setError('Revisa los montos: máximo 2 decimales.')

    setGuardando(true)
    setError(null)
    try {
      await saveSale(
        db,
        {
          channel_id: canalId,
          fecha,
          costo_envio: envioN,
          impuestos: impuestosN,
          estado_cobro: estado,
          fecha_liberacion_estimada: FECHA.test(liberacionTxt) ? liberacionTxt : null,
          fecha_liberacion_real: estado === 'liberado' && FECHA.test(fechaReal) ? fechaReal : null,
          id_orden: idOrden.trim() === '' ? null : idOrden.trim(),
          notas: notas.trim() === '' ? null : notas.trim(),
        },
        lineas.map((l) => ({
          id: l.id,
          product_id: l.product_id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          comision: l.comision,
          cargo_fijo: l.cargo_fijo,
          costo_unitario: l.costo_unitario,
        })),
        venta?.id,
      )
      void syncNow()
      navigate('/ventas')
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'ORDEN_DUPLICADA'
          ? 'Esa orden ya está registrada en este canal.'
          : 'No se pudo guardar la venta.',
      )
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!venta) return
    await deleteSale(db, venta.id)
    void syncNow()
    navigate('/ventas')
  }

  const colorUtilidad = calculo && calculo.utilidad !== null && calculo.utilidad < 0 ? 'text-red-600' : 'text-emerald-600'

  return (
    <div className="px-4 pb-44 pt-4">
      <Link to="/ventas" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Ventas
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{venta ? 'Editar venta' : 'Nueva venta'}</h1>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="canal">Canal</Label>
          <select
            id="canal"
            value={canalId}
            disabled={lineas.length > 0}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setCanalId(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            {canalesVisibles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {lineas.length > 0 && (
            <p className="text-xs text-neutral-500">Para cambiar de canal, quita primero los productos.</p>
          )}
          {canalesVisibles.length === 0 && (
            <p className="text-xs text-neutral-500">Aún no hay canales. Agrégalos en Más → Canales de venta.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo id="fecha" label="Fecha" type="date" value={fecha} onChange={setFecha} maxLength={10} />
          <Campo id="orden" label="Número de orden" value={idOrden} onChange={setIdOrden} maxLength={80} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-medium">Productos</h2>
        <Button size="sm" disabled={!canalId} onClick={() => abrirLinea(null)}>
          <Plus className="mr-1 size-4" />
          Agregar
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {lineas.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Aún no agregas productos.
          </div>
        )}
        {lineas.map((l) => {
          const excede = (pedido.get(l.product_id) ?? 0) > disponible(l.product_id)
          return (
            <div key={l.key} className="rounded-xl border border-neutral-200 pr-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => abrirLinea(l)}
                  className="flex min-h-14 flex-1 flex-col justify-center px-4 py-2 text-left"
                >
                  <span className="font-medium">{nombres.get(l.product_id) ?? 'Producto eliminado'}</span>
                  <span className="text-xs text-neutral-500">
                    {l.cantidad} × {formatMXN(l.precio_unitario)} · cargo {formatMXN(l.comision + l.cargo_fijo)}
                  </span>
                </button>
                <span className="font-medium">{formatMXN(totalLinea(l.cantidad, l.precio_unitario))}</span>
                <button
                  type="button"
                  aria-label="Quitar producto"
                  onClick={() => setLineas((prev) => prev.filter((x) => x.key !== l.key))}
                  className="flex size-10 items-center justify-center text-neutral-400"
                >
                  <X className="size-5" />
                </button>
              </div>
              {excede && (
                <p className="px-4 pb-2 text-xs text-red-600">
                  Solo tienes {disponible(l.product_id)} en existencias de este producto.
                </p>
              )}
            </div>
          )
        })}
      </div>

      {lineas.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">Del pedido completo</p>
              <button type="button" className="text-xs text-neutral-500 underline" onClick={() => setOv({})}>
                Restablecer cálculo
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              El envío se paga una vez por pedido. Corrige ambos montos con lo que realmente te cobró el canal.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Campo id="envio" label="Costo por envío" value={envioTxt} onChange={(v) => poner('envio', v)} maxLength={13} inputMode="decimal" />
              <Campo id="impuestos" label="Impuestos" value={impuestosTxt} onChange={(v) => poner('impuestos', v)} maxLength={13} inputMode="decimal" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cobro</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['pendiente', 'liberado'] as const).map((e) => (
                <Button
                  key={e}
                  type="button"
                  variant={estado === e ? 'default' : 'outline'}
                  className="h-11"
                  onClick={() => setEstado(e)}
                >
                  {e === 'pendiente' ? 'Pendiente' : 'Liberado'}
                </Button>
              ))}
            </div>
          </div>
          {estado === 'pendiente' ? (
            <Campo
              id="liberacion"
              label="Liberación estimada"
              type="date"
              value={liberacionTxt}
              onChange={(v) => poner('liberacion', v)}
              maxLength={10}
            />
          ) : (
            <Campo id="real" label="Fecha en que se liberó" type="date" value={fechaReal} onChange={setFechaReal} maxLength={10} />
          )}

          <Campo id="notas" label="Notas (opcional)" value={notas} onChange={setNotas} maxLength={1000} />

          <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
            {calculo ? (
              <>
                <Linea etiqueta="Ingreso por productos" valor={formatMXN(calculo.ingreso)} clase="" />
                <Linea etiqueta="Cargo por venta" valor={`−${formatMXN(calculo.cargos)}`} />
                <Linea etiqueta="Costo por envío" valor={`−${formatMXN(envioN ?? 0)}`} />
                <Linea etiqueta="Impuestos" valor={`−${formatMXN(impuestosN ?? 0)}`} />
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-medium">
                  <span>Neto a depositar</span>
                  <span>{formatMXN(calculo.neto)}</span>
                </div>
                {calculo.costo !== null && calculo.utilidad !== null ? (
                  <>
                    <Linea etiqueta="Costo de los productos" valor={`−${formatMXN(calculo.costo)}`} />
                    <Linea
                      etiqueta="Utilidad"
                      valor={formatMXN(calculo.utilidad)}
                      clase={`font-medium ${colorUtilidad}`}
                    />
                    <Linea
                      etiqueta="Margen sobre ingreso"
                      valor={calculo.margenPct === null ? '—' : `${calculo.margenPct}%`}
                      clase=""
                    />
                    <Linea
                      etiqueta="ROI"
                      valor={calculo.roiPct === null ? '—' : `${calculo.roiPct}%`}
                      clase={`font-medium ${colorUtilidad}`}
                    />
                  </>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Falta el costo de {calculo.lineasSinCosto} {calculo.lineasSinCosto === 1 ? 'producto' : 'productos'}:
                    sin él no se calcula la utilidad.
                  </p>
                )}
              </>
            ) : (
              <p className="text-neutral-500">Revisa los montos para ver el desglose.</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {venta &&
        (confirmando ? (
          <div className="mt-6 flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="h-11 flex-1" onClick={() => void eliminar()}>
              Sí, eliminar
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" className="mt-6 h-11 w-full text-red-600" onClick={() => setConfirmando(true)}>
            <Trash2 className="mr-2 size-4" />
            Eliminar venta
          </Button>
        ))}

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-500">Neto a depositar</p>
            <p className="font-semibold">{calculo ? formatMXN(calculo.neto) : '—'}</p>
          </div>
          <Button onClick={() => void guardar()} disabled={guardando || lineas.length === 0} className="h-11 px-8">
            {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
            Guardar venta
          </Button>
        </div>
      </div>

      <Drawer open={lineaAbierta} onOpenChange={setLineaAbierta}>
        <DrawerContent>
          <LineaVentaForm
            key={lineaSel?.key ?? 'nueva'}
            productos={productos}
            stats={stats}
            canalId={canalId}
            listings={listings}
            listingTaxes={listingTaxes}
            tipos={tipos}
            ivaGeneral={ivaGeneral}
            linea={lineaSel}
            onSave={guardarLinea}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export function SaleFormPage() {
  const { id } = useParams<{ id: string }>()
  const { db } = useSync()

  const datos = useLiveQuery(async () => {
    const productos = await db.products.toArray()
    const canales = await db.channels.toArray()
    const listings = (await db.listings.toArray()).filter((l) => l.deleted_at === null)
    const listingTaxes = (await db.listing_taxes.toArray()).filter((t) => t.deleted_at === null)
    const tipos = await db.tax_types.toArray()
    const venta = id ? ((await db.sales.get(id)) ?? null) : null
    const items = id
      ? (await db.sale_items.where('sale_id').equals(id).toArray()).filter((i) => i.deleted_at === null)
      : []
    return { productos, canales, listings, listingTaxes, tipos, venta, items }
  }, [db, id])

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }
  if (id && (!datos.venta || datos.venta.deleted_at !== null)) {
    return <Navigate to="/ventas" replace />
  }

  return <SaleForm key={id ?? 'nueva'} {...datos} />
}
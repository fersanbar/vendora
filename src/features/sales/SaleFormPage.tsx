import { useState, type ChangeEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type {
  LocalChannel,
  LocalListing,
  LocalListingTax,
  LocalProduct,
  LocalSale,
  LocalTaxType,
} from '@/lib/db'
import { hoyLocal, sumarDias } from '@/lib/dates'
import { calcularVenta, formatMXN, parseCantidad, parseCosto, parseMonto } from '@/lib/money'
import { useProductStats } from '@/features/purchases/useProductStats'
import { useSync } from '@/features/sync/useSync'
import { useIvaGeneral } from '@/features/taxes/useIvaGeneral'
import { deleteSale, saveSale } from './sales.repo'
import { sugerirDesdePublicacion } from './sugerencia'

type Campos = 'precio' | 'comision' | 'fijo' | 'envio' | 'impuestos' | 'costo' | 'liberacion'

interface Props {
  venta: LocalSale | null
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

function SaleForm({ venta, productos, canales, listings, listingTaxes, tipos }: Props) {
  const { db, syncNow } = useSync()
  const navigate = useNavigate()
  const stats = useProductStats()
  const ivaGeneral = useIvaGeneral()

  const canalesVisibles = canales
    .filter((c) => c.activo || c.id === venta?.channel_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const [productoId, setProductoId] = useState(venta?.product_id ?? '')
  const [busqueda, setBusqueda] = useState('')
  const [canalId, setCanalId] = useState(venta?.channel_id ?? canalesVisibles[0]?.id ?? '')
  const [fecha, setFecha] = useState(venta?.fecha ?? hoyLocal())
  const [cantidad, setCantidad] = useState(venta ? String(venta.cantidad) : '1')
  const [ov, setOv] = useState<Partial<Record<Campos, string>>>(() =>
    venta
      ? {
          precio: String(venta.precio_unitario),
          comision: String(venta.comision),
          fijo: String(venta.cargo_fijo),
          envio: String(venta.costo_envio),
          impuestos: String(venta.impuestos),
          costo: venta.costo_unitario === null ? '' : String(venta.costo_unitario),
          liberacion: venta.fecha_liberacion_estimada ?? '',
        }
      : {},
  )
  const [estado, setEstado] = useState<LocalSale['estado_cobro']>(venta?.estado_cobro ?? 'pendiente')
  const [fechaReal, setFechaReal] = useState(venta?.fecha_liberacion_real ?? hoyLocal())
  const [idOrden, setIdOrden] = useState(venta?.id_orden ?? '')
  const [notas, setNotas] = useState(venta?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function poner(campo: Campos, valor: string) {
    setOv((prev) => ({ ...prev, [campo]: valor }))
  }

  const producto = productos.find((p) => p.id === productoId)
  const listing = listings.find((l) => l.product_id === productoId && l.channel_id === canalId) ?? null
  const impListing = listing ? listingTaxes.filter((t) => t.listing_id === listing.id) : []
  const claveTipo = new Map(tipos.map((t) => [t.id, t.clave]))
  const aplicaIva = impListing.some((t) => claveTipo.get(t.tax_type_id) === 'iva')

  const cantidadN = parseCantidad(cantidad)
  const precioTxt = ov.precio ?? (listing ? String(listing.precio_venta) : '')
  const precioN = parseMonto(precioTxt)

  const sugerencia =
    listing && cantidadN !== null && precioN !== null
      ? sugerirDesdePublicacion({
          listing,
          impuestos: impListing,
          aplicaIva,
          ivaGeneral,
          cantidad: cantidadN,
          precioUnitario: precioN,
        })
      : null

  const comisionTxt = ov.comision ?? (sugerencia ? String(sugerencia.comision) : '')
  const fijoTxt = ov.fijo ?? (sugerencia ? String(sugerencia.cargo_fijo) : '')
  const envioTxt = ov.envio ?? (sugerencia ? String(sugerencia.costo_envio) : '')
  const impuestosTxt = ov.impuestos ?? (sugerencia ? String(sugerencia.impuestos) : '')
  const costoProm = productoId ? (stats?.get(productoId)?.costoPromedio ?? null) : null
  const costoTxt = ov.costo ?? (costoProm !== null ? String(costoProm) : '')
  const liberacionTxt =
    ov.liberacion ?? (listing && FECHA.test(fecha) ? sumarDias(fecha, listing.dias_liberacion) : '')

  const comisionN = parseMonto(comisionTxt)
  const fijoN = parseMonto(fijoTxt)
  const envioN = parseMonto(envioTxt)
  const impuestosN = parseMonto(impuestosTxt)
  const costoN = costoTxt.trim() === '' ? null : parseCosto(costoTxt)
  const costoInvalido = costoTxt.trim() !== '' && costoN === null

  const calculo =
    cantidadN !== null &&
    precioN !== null &&
    comisionN !== null &&
    fijoN !== null &&
    envioN !== null &&
    impuestosN !== null &&
    !costoInvalido
      ? calcularVenta({
          cantidad: cantidadN,
          precio_unitario: precioN,
          comision: comisionN,
          cargo_fijo: fijoN,
          costo_envio: envioN,
          impuestos: impuestosN,
          costo_unitario: costoN,
        })
      : null

  const propia = venta && venta.product_id === productoId ? venta.cantidad : 0
  const disponible = (stats?.get(productoId)?.stock ?? 0) + propia
  const excede = producto !== undefined && cantidadN !== null && cantidadN > disponible

  const activos = productos.filter((p) => p.deleted_at === null)
  const q = busqueda.trim().toLowerCase()
  const resultados = activos
    .filter((p) => q === '' || [p.nombre, p.sku, p.codigo_barras].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, 20)

  async function guardar() {
    if (!productoId) return setError('Elige un producto.')
    if (!canalId) return setError('Elige un canal.')
    if (!FECHA.test(fecha)) return setError('Elige la fecha de la venta.')
    if (cantidadN === null) return setError('La cantidad debe ser un entero mayor a 0.')
    if (precioN === null || comisionN === null || fijoN === null || envioN === null || impuestosN === null) {
      return setError('Revisa los montos: máximo 2 decimales.')
    }
    if (costoInvalido) return setError('Revisa el costo: máximo 4 decimales.')

    setGuardando(true)
    setError(null)
    try {
      await saveSale(
        db,
        {
          product_id: productoId,
          channel_id: canalId,
          fecha,
          cantidad: cantidadN,
          precio_unitario: precioN,
          comision: comisionN,
          cargo_fijo: fijoN,
          costo_envio: envioN,
          impuestos: impuestosN,
          costo_unitario: costoN,
          estado_cobro: estado,
          fecha_liberacion_estimada: FECHA.test(liberacionTxt) ? liberacionTxt : null,
          fecha_liberacion_real: estado === 'liberado' && FECHA.test(fechaReal) ? fechaReal : null,
          id_orden: idOrden.trim() === '' ? null : idOrden.trim(),
          notas: notas.trim() === '' ? null : notas.trim(),
        },
        venta?.id,
      )
      void syncNow()
      navigate('/ventas')
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'ORDEN_DUPLICADA'
          ? 'Esa orden ya está registrada para este producto y canal.'
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
        {!producto ? (
          <div className="space-y-2">
            <Label htmlFor="buscar">Producto</Label>
            <Input
              id="buscar"
              value={busqueda}
              placeholder="Buscar por nombre, SKU o código"
              className="h-11"
              onChange={(e: ChangeEvent<HTMLInputElement>) => setBusqueda(e.target.value)}
            />
            {activos.length === 0 && (
              <p className="text-sm text-neutral-500">Aún no tienes productos. Créalos primero en Inventario.</p>
            )}
            {resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductoId(p.id)}
                className="flex min-h-12 w-full flex-col justify-center rounded-xl border border-neutral-200 px-4 py-2 text-left"
              >
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-neutral-500">{p.sku ?? 'Sin SKU'}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Producto</Label>
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <span className="font-medium">{producto.nombre}</span>
              <button type="button" className="text-sm text-neutral-500 underline" onClick={() => setProductoId('')}>
                Cambiar
              </button>
            </div>
          </div>
        )}

        {producto && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="canal">Canal</Label>
              <select
                id="canal"
                value={canalId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setCanalId(e.target.value)}
                className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
              >
                {canalesVisibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {canalesVisibles.length === 0 && (
                <p className="text-xs text-neutral-500">Aún no hay canales. Agrégalos en Más → Canales de venta.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Campo id="fecha" label="Fecha" type="date" value={fecha} onChange={setFecha} maxLength={10} />
              <Campo id="cantidad" label="Cantidad" value={cantidad} onChange={setCantidad} maxLength={6} inputMode="numeric" />
            </div>
            <p className={`text-xs ${excede ? 'text-red-600' : 'text-neutral-500'}`}>
              {excede ? `Solo tienes ${disponible} en existencias.` : `Existencias: ${disponible}`}
            </p>

            <Campo
              id="precio"
              label="Precio de venta por pieza (MXN)"
              value={precioTxt}
              onChange={(v) => poner('precio', v)}
              maxLength={13}
              inputMode="decimal"
            />

            <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">Lo que te cobraron (total de la venta)</p>
                {listing && (
                  <button type="button" className="text-xs text-neutral-500 underline" onClick={() => setOv({})}>
                    Restablecer cálculo
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {listing
                  ? 'Se calcula con la publicación de este producto. Corrígelo con lo que realmente te cobró el canal.'
                  : 'Este producto no está publicado en este canal. Captura los montos reales.'}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Campo id="comision" label="Comisión" value={comisionTxt} onChange={(v) => poner('comision', v)} maxLength={13} inputMode="decimal" />
                <Campo id="fijo" label="Cargo fijo" value={fijoTxt} onChange={(v) => poner('fijo', v)} maxLength={13} inputMode="decimal" />
                <Campo id="envio" label="Envío o FBA" value={envioTxt} onChange={(v) => poner('envio', v)} maxLength={13} inputMode="decimal" />
                <Campo id="impuestos" label="Impuestos" value={impuestosTxt} onChange={(v) => poner('impuestos', v)} maxLength={13} inputMode="decimal" />
              </div>
            </div>

            <Campo
              id="costo"
              label="Costo por pieza (MXN)"
              value={costoTxt}
              onChange={(v) => poner('costo', v)}
              maxLength={13}
              inputMode="decimal"
              placeholder="Sin compras registradas"
            />

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

            <div className="grid grid-cols-2 gap-3">
              <Campo id="orden" label="Número de orden (opcional)" value={idOrden} onChange={setIdOrden} maxLength={80} />
              <Campo id="notas" label="Notas (opcional)" value={notas} onChange={setNotas} maxLength={1000} />
            </div>

            <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
              {calculo ? (
                <>
                  <Linea etiqueta="Ingreso" valor={formatMXN(calculo.ingreso)} clase="" />
                  <Linea etiqueta="Comisión" valor={`−${formatMXN(comisionN ?? 0)}`} />
                  <Linea etiqueta="Cargo fijo" valor={`−${formatMXN(fijoN ?? 0)}`} />
                  <Linea etiqueta="Envío o FBA" valor={`−${formatMXN(envioN ?? 0)}`} />
                  <Linea etiqueta="Impuestos" valor={`−${formatMXN(impuestosN ?? 0)}`} />
                  <div className="flex justify-between border-t border-neutral-200 pt-2 font-medium">
                    <span>Neto a depositar</span>
                    <span>{formatMXN(calculo.neto)}</span>
                  </div>
                  {calculo.costo !== null && calculo.utilidad !== null ? (
                    <>
                      <Linea etiqueta="Costo" valor={`−${formatMXN(calculo.costo)}`} />
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
                    <p className="text-xs text-neutral-500">Sin costo no se puede calcular la utilidad.</p>
                  )}
                </>
              ) : (
                <p className="text-neutral-500">Revisa los números para ver el desglose.</p>
              )}
            </div>
          </>
        )}
      </div>

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
            <Button type="button" variant="destructive" className="h-11 flex-1" onClick={eliminar}>
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
          <Button onClick={() => void guardar()} disabled={guardando || !producto} className="h-11 px-8">
            {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
            Guardar venta
          </Button>
        </div>
      </div>
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
    return { productos, canales, listings, listingTaxes, tipos, venta }
  }, [db, id])

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }
  if (id && (!datos.venta || datos.venta.deleted_at !== null)) {
    return <Navigate to="/ventas" replace />
  }

  return <SaleForm key={id ?? 'nueva'} {...datos} />
}

import { useState, type ChangeEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertCircle,
  ArrowDown,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Clock3,
  Loader2,
  Package,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
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
import {
  calcularPedido,
  formatMXN,
  parseMonto,
  sumar,
  totalLinea,
} from '@/lib/money'
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

function Linea({
  etiqueta,
  valor,
  clase = 'text-slate-500',
}: {
  etiqueta: string
  valor: string
  clase?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${clase}`}>
      <span>{etiqueta}</span>
      <span className="shrink-0 text-right tabular-nums">{valor}</span>
    </div>
  )
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

function SaleForm({
  venta,
  items,
  productos,
  canales,
  listings,
  listingTaxes,
  tipos,
}: Props) {
  const { db, syncNow } = useSync()
  const navigate = useNavigate()
  const stats = useProductStats()
  const ivaGeneral = useIvaGeneral()

  const canalesVisibles = canales
    .filter((c) => c.activo || c.id === venta?.channel_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const [canalId, setCanalId] = useState(
    venta?.channel_id ?? canalesVisibles[0]?.id ?? '',
  )
  const [fecha, setFecha] = useState(venta?.fecha ?? hoyLocal())

  const [lineas, setLineas] = useState<LineaVentaEstado[]>(() =>
    items.map((i) => {
      const ctx = contextoPublicacion(
        i.product_id,
        venta?.channel_id ?? '',
        listings,
        listingTaxes,
        tipos,
      )

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

  const [estado, setEstado] = useState<LocalSale['estado_cobro']>(
    venta?.estado_cobro ?? 'pendiente',
  )
  const [fechaReal, setFechaReal] = useState(
    venta?.fecha_liberacion_real ?? hoyLocal(),
  )
  const [idOrden, setIdOrden] = useState(venta?.id_orden ?? '')
  const [notas, setNotas] = useState(venta?.notas ?? '')
  const [lineaAbierta, setLineaAbierta] = useState(false)
  const [lineaSel, setLineaSel] = useState<LineaVentaEstado | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function poner(campo: CamposPedido, valor: string) {
    setOv((prev) => ({ ...prev, [campo]: valor }))
    setError(null)
  }

  function abrirLinea(l: LineaVentaEstado | null) {
    setLineaSel(l)
    setLineaAbierta(true)
  }

  function guardarLinea(l: LineaVentaEstado) {
    setLineas((prev) =>
      prev.some((x) => x.key === l.key)
        ? prev.map((x) => (x.key === l.key ? l : x))
        : [...prev, l],
    )
    setLineaAbierta(false)
    setError(null)
  }

  // El envío se captura una sola vez por pedido.
  // Con varios productos se toma la referencia más alta.
  const envioTxt =
    ov.envio ??
    String(lineas.reduce((max, l) => Math.max(max, l.envioReferencia), 0))

  const impuestosTxt =
    ov.impuestos ?? String(sumar(lineas.map((l) => l.impuestoSugerido)))

  const dias = lineas.reduce(
    (max, l) => Math.max(max, l.diasLiberacion),
    0,
  )

  const liberacionTxt =
    ov.liberacion ??
    (lineas.length > 0 && FECHA.test(fecha)
      ? sumarDias(fecha, dias)
      : '')

  const envioN = parseMonto(envioTxt)
  const impuestosN = parseMonto(impuestosTxt)

  const calculo =
    lineas.length > 0 && envioN !== null && impuestosN !== null
      ? calcularPedido({
          lineas,
          costo_envio: envioN,
          impuestos: impuestosN,
        })
      : null

  const nombres = new Map(productos.map((p) => [p.id, p.nombre]))

  const pedido = new Map<string, number>()
  for (const l of lineas) {
    pedido.set(
      l.product_id,
      (pedido.get(l.product_id) ?? 0) + l.cantidad,
    )
  }

  const propias = new Map<string, number>()
  for (const i of items) {
    propias.set(
      i.product_id,
      (propias.get(i.product_id) ?? 0) + i.cantidad,
    )
  }

  const disponible = (productId: string) =>
    (stats?.get(productId)?.stock ?? 0) +
    (propias.get(productId) ?? 0)

  const productosExcedidos = lineas.filter(
    (l) => (pedido.get(l.product_id) ?? 0) > disponible(l.product_id),
  ).length

  async function guardar() {
    if (!canalId) return setError('Elige un canal.')
    if (!FECHA.test(fecha)) return setError('Elige la fecha de la venta.')
    if (lineas.length === 0)
      return setError('Agrega al menos un producto.')
    if (envioN === null || impuestosN === null)
      return setError('Revisa los montos: máximo 2 decimales.')

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
          fecha_liberacion_estimada: FECHA.test(liberacionTxt)
            ? liberacionTxt
            : null,
          fecha_liberacion_real:
            estado === 'liberado' && FECHA.test(fechaReal)
              ? fechaReal
              : null,
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
    if (!venta || eliminando) return

    setEliminando(true)
    setError(null)

    try {
      await deleteSale(db, venta.id)
      void syncNow()
      navigate('/ventas')
    } catch {
      setError('No se pudo eliminar la venta.')
      setEliminando(false)
      setConfirmando(false)
    }
  }

  const colorUtilidad =
    calculo && calculo.utilidad !== null && calculo.utilidad < 0
      ? 'text-rose-600'
      : 'text-emerald-600'

  return (
    <div className="min-h-screen bg-slate-50/70 px-4 pb-44 pt-4">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/ventas"
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-violet-700"
        >
          <ChevronLeft size={17} />
          Ventas
        </Link>

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-sm">
              <ShoppingBag size={20} />
            </div>
            <span className="text-xs font-bold tracking-[0.18em] text-slate-500">
              VENDORA
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {venta ? 'Editar venta' : 'Nueva venta'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra los productos y revisa cuánto recibirás por este pedido.
          </p>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ReceiptText size={18} className="text-violet-700" />
              <h2 className="font-bold text-slate-900">
                Información del pedido
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="canal"
                  className="text-sm font-semibold text-slate-700"
                >
                  Canal de venta
                </Label>

                <select
                  id="canal"
                  value={canalId}
                  disabled={lineas.length > 0}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    setCanalId(e.target.value)
                    setError(null)
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {canalesVisibles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>

                {lineas.length > 0 && (
                  <p className="text-xs text-slate-500">
                    Para cambiar de canal, quita primero los productos.
                  </p>
                )}

                {canalesVisibles.length === 0 && (
                  <p className="text-xs text-slate-500">
                    Aún no hay canales. Agrégalos en Más → Canales de venta.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="fecha"
                  label="Fecha de venta"
                  type="date"
                  value={fecha}
                  onChange={(v) => {
                    setFecha(v)
                    setError(null)
                  }}
                  maxLength={10}
                />

                <Campo
                  id="orden"
                  label="Número de orden"
                  value={idOrden}
                  onChange={setIdOrden}
                  maxLength={80}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">Productos</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {lineas.length} {lineas.length === 1 ? 'producto' : 'productos'} en el pedido
                </p>
              </div>

              <Button
                size="sm"
                disabled={!canalId}
                onClick={() => abrirLinea(null)}
                className="rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] shadow-sm"
              >
                <Plus size={16} className="mr-1.5" />
                Agregar
              </Button>
            </div>

            {lineas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-9 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <Package size={23} />
                </div>
                <p className="font-semibold text-slate-800">
                  Tu pedido está vacío
                </p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">
                  Agrega los productos que forman parte de esta venta.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canalId}
                  onClick={() => abrirLinea(null)}
                  className="mt-4 rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
                >
                  <Plus size={16} className="mr-1.5" />
                  Agregar primer producto
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {lineas.map((l) => {
                  const excede =
                    (pedido.get(l.product_id) ?? 0) >
                    disponible(l.product_id)

                  return (
                    <div
                      key={l.key}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
                    >
                      <div className="flex items-center gap-2 p-3">
                        <button
                          type="button"
                          onClick={() => abrirLinea(l)}
                          className="flex min-h-[62px] min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <Package size={19} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {nombres.get(l.product_id) ??
                                'Producto eliminado'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {l.cantidad} × {formatMXN(l.precio_unitario)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Comisión y cargo: {formatMXN(l.comision + l.cargo_fijo)}
                            </p>
                          </div>
                        </button>

                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-slate-900">
                            {formatMXN(
                              totalLinea(l.cantidad, l.precio_unitario),
                            )}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setLineas((prev) =>
                                prev.filter((x) => x.key !== l.key),
                              )
                            }
                            aria-label="Quitar producto"
                            className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <X size={17} />
                          </button>
                        </div>
                      </div>

                      {excede && (
                        <div className="flex items-start gap-2 border-t border-rose-100 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
                          <AlertCircle
                            size={15}
                            className="mt-0.5 shrink-0"
                          />
                          <span>
                            Solo tienes {disponible(l.product_id)} en
                            existencias de este producto.
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {productosExcedidos > 0 && (
              <p className="mt-2 text-xs text-rose-600">
                Revisa las existencias antes de registrar esta venta.
              </p>
            )}
          </section>

          {lineas.length > 0 && (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Truck size={18} className="text-violet-700" />
                  <h2 className="font-bold text-slate-900">
                    Cargos del pedido
                  </h2>
                </div>

                <p className="mb-4 text-xs leading-relaxed text-slate-500">
                  Estos importes se registran una sola vez por pedido, no por
                  cada producto. Ajusta los valores según el cobro real del
                  canal.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <Campo
                    id="envio"
                    label="Costo de envío"
                    value={envioTxt}
                    onChange={(v) => poner('envio', v)}
                    maxLength={13}
                    inputMode="decimal"
                  />
                  <Campo
                    id="impuestos"
                    label="Impuestos"
                    value={impuestosTxt}
                    onChange={(v) => poner('impuestos', v)}
                    maxLength={13}
                    inputMode="decimal"
                  />
                </div>

                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 transition hover:text-violet-900"
                  onClick={() => {
                    setOv((prev) => ({
                      ...prev,
                      envio: undefined,
                      impuestos: undefined,
                    }))
                    setError(null)
                  }}
                >
                  <ArrowDown size={13} />
                  Restablecer sugerencias
                </button>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <CircleDollarSign size={18} className="text-violet-700" />
                  <h2 className="font-bold text-slate-900">
                    Estado del cobro
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEstado('pendiente')}
                    className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                      estado === 'pendiente'
                        ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Clock3 size={16} />
                    Pendiente
                  </button>

                  <button
                    type="button"
                    onClick={() => setEstado('liberado')}
                    className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
                      estado === 'liberado'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Check size={16} />
                    Liberado
                  </button>
                </div>

                <div className="mt-4">
                  {estado === 'pendiente' ? (
                    <Campo
                      id="liberacion"
                      label="Fecha estimada de liberación"
                      type="date"
                      value={liberacionTxt}
                      onChange={(v) => poner('liberacion', v)}
                      maxLength={10}
                    />
                  ) : (
                    <Campo
                      id="real"
                      label="Fecha en que se liberó"
                      type="date"
                      value={fechaReal}
                      onChange={setFechaReal}
                      maxLength={10}
                    />
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarDays size={18} className="text-violet-700" />
                  <h2 className="font-bold text-slate-900">
                    Notas del pedido
                  </h2>
                </div>

                <Campo
                  id="notas"
                  label="Notas (opcional)"
                  value={notas}
                  onChange={setNotas}
                  maxLength={1000}
                  placeholder="Información adicional sobre esta venta"
                />
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-violet-700" />
                    <h2 className="font-bold text-slate-900">
                      Resumen financiero
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Desglose estimado de esta operación.
                  </p>
                </div>

                <div className="space-y-3 p-4 text-sm">
                  {calculo ? (
                    <>
                      <Linea
                        etiqueta="Ingreso por productos"
                        valor={formatMXN(calculo.ingreso)}
                        clase="font-medium text-slate-700"
                      />
                      <Linea
                        etiqueta="Comisiones y cargos"
                        valor={`−${formatMXN(calculo.cargos)}`}
                      />
                      <Linea
                        etiqueta="Costo por envío"
                        valor={`−${formatMXN(envioN ?? 0)}`}
                      />
                      <Linea
                        etiqueta="Impuestos"
                        valor={`−${formatMXN(impuestosN ?? 0)}`}
                      />

                      <div className="border-t border-slate-100 pt-3">
                        <Linea
                          etiqueta="Neto a depositar"
                          valor={formatMXN(calculo.neto)}
                          clase="text-base font-bold text-slate-900"
                        />
                      </div>

                      {calculo.costo !== null &&
                      calculo.utilidad !== null ? (
                        <>
                          <div className="border-t border-slate-100 pt-3">
                            <Linea
                              etiqueta="Costo de los productos"
                              valor={`−${formatMXN(calculo.costo)}`}
                            />
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <Linea
                              etiqueta="Utilidad estimada"
                              valor={formatMXN(calculo.utilidad)}
                              clase={`text-base font-bold ${colorUtilidad}`}
                            />

                            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                              <div>
                                <p className="text-xs text-slate-500">
                                  Margen sobre ingreso
                                </p>
                                <p className="mt-1 font-bold text-slate-800">
                                  {calculo.margenPct === null
                                    ? '—'
                                    : `${calculo.margenPct}%`}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-slate-500">ROI</p>
                                <p className={`mt-1 font-bold ${colorUtilidad}`}>
                                  {calculo.roiPct === null
                                    ? '—'
                                    : `${calculo.roiPct}%`}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                          <AlertCircle
                            size={16}
                            className="mt-0.5 shrink-0"
                          />
                          <p>
                            Falta el costo de {calculo.lineasSinCosto}{' '}
                            {calculo.lineasSinCosto === 1
                              ? 'producto'
                              : 'productos'}
                            . Sin ese dato no se puede calcular la utilidad.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="py-3 text-center text-sm text-slate-500">
                      Revisa los montos para ver el desglose financiero.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700"
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {venta && (
          <div className="mt-6 border-t border-slate-200 pt-5">
            {confirmando ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-800">
                  ¿Eliminar esta venta?
                </p>
                <p className="mt-1 text-xs text-rose-700">
                  Esta acción eliminará el registro de la venta.
                </p>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-xl border-rose-200 bg-white"
                    disabled={eliminando}
                    onClick={() => setConfirmando(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 flex-1 rounded-xl"
                    disabled={eliminando}
                    onClick={() => void eliminar()}
                  >
                    {eliminando && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Sí, eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setConfirmando(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Eliminar venta
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_25px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-slate-500">
              Neto a depositar
            </p>
            <p className="truncate text-lg font-bold tabular-nums text-slate-900">
              {calculo ? formatMXN(calculo.neto) : '—'}
            </p>
          </div>

          <Button
            onClick={() => void guardar()}
            disabled={guardando || lineas.length === 0}
            className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] px-6 font-semibold shadow-md shadow-indigo-950/10"
          >
            {guardando ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Check className="mr-2 size-4" />
            )}
            {guardando ? 'Guardando...' : 'Guardar venta'}
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
    const listings = (await db.listings.toArray()).filter(
      (l) => l.deleted_at === null,
    )
    const listingTaxes = (await db.listing_taxes.toArray()).filter(
      (t) => t.deleted_at === null,
    )
    const tipos = await db.tax_types.toArray()
    const venta = id ? ((await db.sales.get(id)) ?? null) : null

    const items = id
      ? (await db.sale_items.where('sale_id').equals(id).toArray()).filter(
          (i) => i.deleted_at === null,
        )
      : []

    return {
      productos,
      canales,
      listings,
      listingTaxes,
      tipos,
      venta,
      items,
    }
  }, [db, id])

  if (datos === undefined) {
    return (
      <div className="min-h-screen bg-slate-50/70 p-4">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-48 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  if (id && (!datos.venta || datos.venta.deleted_at !== null)) {
    return <Navigate to="/ventas" replace />
  }

  return <SaleForm key={id ?? 'nueva'} {...datos} />
}

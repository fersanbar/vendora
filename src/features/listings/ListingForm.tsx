
import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  AlertCircle,
  Boxes,
  Calculator,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  Megaphone,
  Receipt,
  ShoppingBag,
  Trash2,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Campo } from '@/components/Campo'

import type {
  LocalChannel,
  LocalListing,
  LocalListingTax,
  LocalTaxType,
} from '@/lib/db'

import {
  calcularMargen,
  calcularNetoConImpuestos,
  formatMXN,
  parseCosto,
  parseDias,
  parseMonto,
  parsePorcentaje,
} from '@/lib/money'

import { setProductCostoReferencia } from '@/features/products/products.repo'
import { resolverCosto } from '@/features/purchases/costo'
import { useProductStats } from '@/features/purchases/useProductStats'
import { useSync } from '@/features/sync/useSync'
import { useIvaGeneral } from '@/features/taxes/useIvaGeneral'
import { deleteListing, saveListing } from './listings.repo'

interface EstadoImpuesto {
  on: boolean
  tasa: string
}

interface Props {
  productId: string
  costoReferencia: number | null
  listing: LocalListing | null
  opciones: LocalChannel[]
  canalNombre: string | null
  tiposImpuesto: LocalTaxType[]
  impuestosActuales: LocalListingTax[]
  onDone: () => void
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
    <div className={`flex items-center justify-between gap-3 text-sm ${clase}`}>
      <span>{etiqueta}</span>
      <span className="shrink-0 font-medium tabular-nums">{valor}</span>
    </div>
  )
}

function Seccion({
  titulo,
  descripcion,
  icon: Icon,
  children,
}: {
  titulo: string
  descripcion?: string
  icon: typeof Wallet
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
          {descripcion && (
            <p className="text-xs text-slate-400">{descripcion}</p>
          )}
        </div>
      </div>

      {children}
    </section>
  )
}

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100'

export function ListingForm({
  productId,
  costoReferencia,
  listing,
  opciones,
  canalNombre,
  tiposImpuesto,
  impuestosActuales,
  onDone,
}: Props) {
  const { db, syncNow } = useSync()
  const ivaGeneral = useIvaGeneral()
  const stats = useProductStats()
  const costoCompras = stats?.get(productId)?.costoPromedio ?? null

  const [canalId, setCanalId] = useState(
    listing?.channel_id ?? opciones[0]?.id ?? '',
  )
  const [precio, setPrecio] = useState(
    listing ? String(listing.precio_venta) : '',
  )
  const [comision, setComision] = useState(
    listing ? String(listing.comision_pct) : '',
  )
  const [cargoFijo, setCargoFijo] = useState(
    listing ? String(listing.cargo_fijo) : '',
  )
  const [envio, setEnvio] = useState(
    listing ? String(listing.costo_envio) : '',
  )
  const [dias, setDias] = useState(
    listing ? String(listing.dias_liberacion) : '',
  )
  const [idExterno, setIdExterno] = useState(listing?.id_externo ?? '')
  const [costoRef, setCostoRef] = useState(
    costoReferencia !== null ? String(costoReferencia) : '',
  )

  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [imp, setImp] = useState<Record<string, EstadoImpuesto>>(() => {
    const mapa: Record<string, EstadoImpuesto> = {}

    for (const t of tiposImpuesto) {
      const actual = impuestosActuales.find(
        (i) => i.tax_type_id === t.id,
      )

      mapa[t.id] = actual
        ? { on: true, tasa: String(actual.tasa_pct) }
        : {
            on: false,
            tasa: t.tasa_pct !== null ? String(t.tasa_pct) : '',
          }
    }

    return mapa
  })

  function cambiarImp(id: string, parcial: Partial<EstadoImpuesto>) {
    setImp((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...parcial },
    }))
  }

  const precioN = parseMonto(precio)
  const comisionN = parsePorcentaje(comision)
  const fijoN = parseMonto(cargoFijo)
  const envioN = parseMonto(envio)
  const diasN = parseDias(dias)

  const costoRefN =
    costoRef.trim() === '' ? null : parseCosto(costoRef)

  const costoRefInvalido =
    costoRef.trim() !== '' && costoRefN === null

  const aplicados: { tipo: LocalTaxType; tasa_pct: number }[] = []
  let impuestosOk = true

  for (const t of tiposImpuesto) {
    const e = imp[t.id]
    if (!e?.on) continue

    const tasaN =
      e.tasa.trim() === '' ? null : parsePorcentaje(e.tasa)

    if (tasaN === null) {
      impuestosOk = false
    } else {
      aplicados.push({ tipo: t, tasa_pct: tasaN })
    }
  }

  const aplicaIva = aplicados.some((a) => a.tipo.clave === 'iva')

  const calculo =
    precioN !== null &&
    comisionN !== null &&
    fijoN !== null &&
    envioN !== null &&
    impuestosOk
      ? calcularNetoConImpuestos(
          precioN,
          comisionN,
          fijoN,
          envioN,
          ivaGeneral,
          aplicaIva,
          aplicados.map((a) => a.tasa_pct),
        )
      : null

  const costo = resolverCosto(
    costoCompras,
    costoRefInvalido ? null : costoRefN,
  )

  const resultado =
    calculo && precioN !== null && costo.valor !== null
      ? calcularMargen(precioN, calculo.neto, costo.valor)
      : null

  async function guardar(e: FormEvent) {
    e.preventDefault()

    if (!canalId) {
      setError('Elige un canal.')
      return
    }

    if (
      precioN === null ||
      comisionN === null ||
      fijoN === null ||
      envioN === null ||
      diasN === null
    ) {
      setError(
        'Revisa los números: máximo 2 decimales en dinero y 3 en la comisión.',
      )
      return
    }

    if (!impuestosOk) {
      setError(
        'Captura la tasa de cada impuesto activado (entre 0 y 100).',
      )
      return
    }

    if (costoRefInvalido) {
      setError('Revisa el costo de referencia: máximo 4 decimales.')
      return
    }

    setGuardando(true)
    setError(null)

    try {
      await saveListing(
        db,
        {
          product_id: productId,
          channel_id: canalId,
          id_externo: idExterno.trim() === '' ? null : idExterno.trim(),
          precio_venta: precioN,
          comision_pct: comisionN,
          cargo_fijo: fijoN,
          costo_envio: envioN,
          dias_liberacion: diasN,
        },
        aplicados.map((a) => ({
          tax_type_id: a.tipo.id,
          tasa_pct: a.tasa_pct,
        })),
        listing?.id,
      )

      await setProductCostoReferencia(db, productId, costoRefN)

      onDone()
      void syncNow()
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'LISTING_DUPLICADO'
          ? 'Este producto ya está publicado en ese canal.'
          : 'No se pudo guardar la publicación.',
      )
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!listing || eliminando) return

    setEliminando(true)
    setError(null)

    try {
      await deleteListing(db, listing.id)
      onDone()
      void syncNow()
    } catch {
      setError('No se pudo quitar la publicación.')
      setEliminando(false)
    }
  }

  const colorNeto =
    calculo && calculo.neto < 0
      ? 'text-rose-600'
      : 'text-emerald-600'

  const colorUtilidad =
    resultado && resultado.utilidad < 0
      ? 'text-rose-600'
      : 'text-emerald-600'

  return (
    <div className="max-h-[85dvh] overflow-y-auto bg-slate-50/70">
      {/* Encabezado */}
      <DrawerHeader className="border-b border-slate-100 bg-white px-5 pb-5 pt-6 text-left">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-md shadow-indigo-950/10">
            <Megaphone className="size-5" />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">
              VENDORA
            </p>
            <DrawerTitle className="text-lg font-bold tracking-tight text-slate-900">
              {listing ? 'Editar publicación' : 'Publicar producto'}
            </DrawerTitle>
          </div>
        </div>

        <DrawerDescription className="text-xs leading-relaxed text-slate-500">
          Configura las tarifas del canal para calcular cuánto recibes y
          cuánto ganas por cada venta. VENDORA no asume tarifas.
        </DrawerDescription>
      </DrawerHeader>

      <form onSubmit={guardar} className="space-y-6 px-5 pb-7 pt-5">
        {/* Canal */}
        <Seccion
          titulo="Canal de venta"
          descripcion="Dónde estará publicada tu oferta"
          icon={ShoppingBag}
        >
          {listing ? (
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
              <StoreIcon />
              {canalNombre ?? 'Canal'}
            </div>
          ) : (
            <select
              id="canal"
              value={canalId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setCanalId(e.target.value)
              }
              className={inputClass}
            >
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </Seccion>

        {/* Precio */}
        <Seccion
          titulo="Precio y tarifas"
          descripcion="Configura los cargos que aplica el canal"
          icon={Wallet}
        >
          <Campo
            id="precio"
            label="Precio de venta (MXN)"
            value={precio}
            onChange={setPrecio}
            maxLength={13}
            inputMode="decimal"
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="comision"
              label="Comisión (%)"
              value={comision}
              onChange={setComision}
              maxLength={7}
              inputMode="decimal"
            />

            <Campo
              id="fijo"
              label="Cargo fijo (MXN)"
              value={cargoFijo}
              onChange={setCargoFijo}
              maxLength={13}
              inputMode="decimal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="envio"
              label="Envío o FBA (MXN)"
              value={envio}
              onChange={setEnvio}
              maxLength={13}
              inputMode="decimal"
            />

            <Campo
              id="dias"
              label="Días a liberación"
              value={dias}
              onChange={setDias}
              maxLength={3}
              inputMode="numeric"
            />
          </div>

          <Campo
            id="externo"
            label="ID en el canal (ASIN, MLM…) opcional"
            value={idExterno}
            onChange={setIdExterno}
            maxLength={60}
          />
        </Seccion>

        {/* Impuestos */}
        <Seccion
          titulo="Impuestos"
          descripcion="Activa los impuestos aplicables a este producto"
          icon={Receipt}
        >
          {tiposImpuesto.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">
                Aún no tienes impuestos configurados.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Puedes crearlos en Más → Impuestos.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tiposImpuesto.map((t) => {
                const e = imp[t.id]
                if (!e) return null

                return (
                  <div
                    key={t.id}
                    className={`rounded-xl border bg-white p-3 transition ${
                      e.on
                        ? 'border-violet-200 shadow-sm shadow-violet-100/50'
                        : 'border-slate-200'
                    }`}
                  >
                    <label className="flex cursor-pointer items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {t.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {e.on ? 'Impuesto aplicado' : 'No aplicado'}
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={e.on}
                        onChange={(ev: ChangeEvent<HTMLInputElement>) =>
                          cambiarImp(t.id, { on: ev.target.checked })
                        }
                        className="size-5 accent-violet-600"
                      />
                    </label>

                    {e.on && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <Campo
                          id={`tasa-${t.id}`}
                          label="Tasa (%)"
                          value={e.tasa}
                          onChange={(v) =>
                            cambiarImp(t.id, { tasa: v })
                          }
                          maxLength={7}
                          inputMode="decimal"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {tiposImpuesto.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl bg-blue-50 p-3">
              <Info className="mt-0.5 size-4 shrink-0 text-blue-600" />
              <p className="text-xs leading-relaxed text-blue-800">
                Con el IVA marcado, los impuestos se calculan sobre el precio
                ÷ {(1 + ivaGeneral / 100).toFixed(2)}. Sin IVA marcado, sobre
                el precio completo.
              </p>
            </div>
          )}
        </Seccion>

        {/* Desglose */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Calculator className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Simulador de rentabilidad
              </h3>
              <p className="text-xs text-slate-400">
                Desglose estimado por cada venta
              </p>
            </div>
          </div>

          <div className="space-y-2.5 p-4">
            {calculo && precioN !== null && fijoN !== null && envioN !== null ? (
              <>
                <Linea
                  etiqueta="Precio de venta"
                  valor={formatMXN(precioN)}
                  clase="font-semibold text-slate-800"
                />

                <Linea
                  etiqueta="Comisión"
                  valor={`−${formatMXN(calculo.comision)}`}
                />

                <Linea
                  etiqueta="Cargo fijo"
                  valor={`−${formatMXN(fijoN)}`}
                />

                <Linea
                  etiqueta="Envío o FBA"
                  valor={`−${formatMXN(envioN)}`}
                />

                {aplicados.length > 0 && (
                  <Linea
                    etiqueta={
                      aplicaIva
                        ? `Base de impuestos (sin IVA general ${ivaGeneral}%)`
                        : 'Base de impuestos (precio completo)'
                    }
                    valor={formatMXN(calculo.baseImpuestos)}
                    clase="text-xs text-slate-400"
                  />
                )}

                {aplicados.map((a, i) => (
                  <Linea
                    key={a.tipo.id}
                    etiqueta={`${a.tipo.nombre} (${a.tasa_pct}%)`}
                    valor={`−${formatMXN(calculo.impuestos[i])}`}
                  />
                ))}

                <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                  <Linea
                    etiqueta="Neto por venta"
                    valor={formatMXN(calculo.neto)}
                    clase={`text-base font-bold ${colorNeto}`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Después de comisión, cargos, envío e impuestos.
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  {costo.valor !== null && resultado ? (
                    <div className="space-y-3">
                      <Linea
                        etiqueta={
                          costo.origen === 'compras'
                            ? 'Costo promedio (tus compras)'
                            : 'Costo de referencia (estimado)'
                        }
                        valor={`−${formatMXN(costo.valor)}`}
                      />

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-500">
                          Utilidad estimada por venta
                        </p>
                        <p
                          className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${colorUtilidad}`}
                        >
                          {formatMXN(resultado.utilidad)}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-lg bg-white p-2.5">
                            <p className="text-[10px] text-slate-400">
                              Margen
                            </p>
                            <p className="mt-0.5 text-sm font-bold text-slate-800">
                              {resultado.margenPct === null
                                ? '—'
                                : `${resultado.margenPct}%`}
                            </p>
                          </div>

                          <div className="rounded-lg bg-white p-2.5">
                            <p className="text-[10px] text-slate-400">
                              ROI
                            </p>
                            <p
                              className={`mt-0.5 text-sm font-bold ${
                                resultado.roiPct !== null &&
                                resultado.roiPct < 0
                                  ? 'text-rose-600'
                                  : 'text-slate-800'
                              }`}
                            >
                              {resultado.roiPct === null
                                ? '—'
                                : `${resultado.roiPct}%`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {costo.origen === 'referencia' && (
                        <p className="text-xs leading-relaxed text-amber-700">
                          Cálculo estimado: se reemplazará por el costo real
                          cuando registres compras.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3">
                      <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
                      <p className="text-xs leading-relaxed text-amber-800">
                        Captura un costo de referencia para ver utilidad,
                        margen y ROI sin comprar el producto.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="py-3 text-center text-sm text-slate-400">
                Revisa los números para ver el desglose.
              </p>
            )}
          </div>
        </section>

        {/* Costo de referencia */}
        <Seccion
          titulo="Costo del producto"
          descripcion="Se comparte entre las publicaciones del mismo producto"
          icon={Boxes}
        >
          <Campo
            id="costo-ref"
            label="Costo de referencia por pieza (opcional)"
            value={costoRef}
            onChange={setCostoRef}
            maxLength={13}
            inputMode="decimal"
          />

          <div className="flex items-start gap-2 rounded-xl bg-slate-100 p-3">
            <Info className="mt-0.5 size-4 shrink-0 text-slate-500" />
            <p className="text-xs leading-relaxed text-slate-600">
              Se utiliza mientras no tengas compras registradas. Cuando
              existan compras, VENDORA utilizará el costo promedio real.
              {costoCompras !== null &&
                ' Actualmente se está utilizando el costo de tus compras.'}
            </p>
          </div>
        </Seccion>

        {/* Liberación */}
        <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Clock3 className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Liberación del dinero
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Los días que tarda el canal en liberar el dinero se utilizan
              para estimar cuándo estará disponible tu ingreso.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <Button
            type="submit"
            disabled={guardando || eliminando}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] font-semibold text-white shadow-md shadow-indigo-950/10 transition hover:brightness-110"
          >
            {guardando ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando publicación...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 size-4" />
                Guardar publicación
              </>
            )}
          </Button>

          {listing &&
            (confirmando ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={eliminando}
                  className="h-11 flex-1 rounded-xl border-slate-200"
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  disabled={eliminando}
                  className="h-11 flex-1 rounded-xl"
                  onClick={eliminar}
                >
                  {eliminando ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 size-4" />
                  )}
                  Sí, quitar
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                disabled={guardando}
                className="h-11 w-full rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() => setConfirmando(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Quitar de este canal
              </Button>
            ))}
        </div>
      </form>
    </div>
  )
}

function StoreIcon() {
  return <ShoppingBag className="size-4 text-slate-400" />
}

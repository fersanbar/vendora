import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type { LocalChannel, LocalListing, LocalListingTax, LocalTaxType } from '@/lib/db'
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
  clase = 'text-neutral-500',
}: {
  etiqueta: string
  valor: string
  clase?: string
}) {
  return (
    <div className={`flex justify-between ${clase}`}>
      <span>{etiqueta}</span>
      <span>{valor}</span>
    </div>
  )
}

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

  const [canalId, setCanalId] = useState(listing?.channel_id ?? opciones[0]?.id ?? '')
  const [precio, setPrecio] = useState(listing ? String(listing.precio_venta) : '')
  const [comision, setComision] = useState(listing ? String(listing.comision_pct) : '')
  const [cargoFijo, setCargoFijo] = useState(listing ? String(listing.cargo_fijo) : '')
  const [envio, setEnvio] = useState(listing ? String(listing.costo_envio) : '')
  const [dias, setDias] = useState(listing ? String(listing.dias_liberacion) : '')
  const [idExterno, setIdExterno] = useState(listing?.id_externo ?? '')
  const [costoRef, setCostoRef] = useState(costoReferencia !== null ? String(costoReferencia) : '')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [imp, setImp] = useState<Record<string, EstadoImpuesto>>(() => {
    const mapa: Record<string, EstadoImpuesto> = {}
    for (const t of tiposImpuesto) {
      const actual = impuestosActuales.find((i) => i.tax_type_id === t.id)
      mapa[t.id] = actual
        ? { on: true, tasa: String(actual.tasa_pct) }
        : { on: false, tasa: t.tasa_pct !== null ? String(t.tasa_pct) : '' }
    }
    return mapa
  })

  function cambiarImp(id: string, parcial: Partial<EstadoImpuesto>) {
    setImp((prev) => ({ ...prev, [id]: { ...prev[id], ...parcial } }))
  }

  const precioN = parseMonto(precio)
  const comisionN = parsePorcentaje(comision)
  const fijoN = parseMonto(cargoFijo)
  const envioN = parseMonto(envio)
  const diasN = parseDias(dias)
  const costoRefN = costoRef.trim() === '' ? null : parseCosto(costoRef)
  const costoRefInvalido = costoRef.trim() !== '' && costoRefN === null

  const aplicados: { tipo: LocalTaxType; tasa_pct: number }[] = []
  let impuestosOk = true
  for (const t of tiposImpuesto) {
    const e = imp[t.id]
    if (!e?.on) continue
    const tasaN = e.tasa.trim() === '' ? null : parsePorcentaje(e.tasa)
    if (tasaN === null) impuestosOk = false
    else aplicados.push({ tipo: t, tasa_pct: tasaN })
  }
  const aplicaIva = aplicados.some((a) => a.tipo.clave === 'iva')

  const calculo =
    precioN !== null && comisionN !== null && fijoN !== null && envioN !== null && impuestosOk
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

  const costo = resolverCosto(costoCompras, costoRefInvalido ? null : costoRefN)
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
    if (precioN === null || comisionN === null || fijoN === null || envioN === null || diasN === null) {
      setError('Revisa los números: máximo 2 decimales en dinero y 3 en la comisión.')
      return
    }
    if (!impuestosOk) {
      setError('Captura la tasa de cada impuesto activado (entre 0 y 100).')
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
        aplicados.map((a) => ({ tax_type_id: a.tipo.id, tasa_pct: a.tasa_pct })),
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
    if (!listing) return
    await deleteListing(db, listing.id)
    onDone()
    void syncNow()
  }

  const colorNeto = calculo && calculo.neto < 0 ? 'text-red-600' : 'text-emerald-600'

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="text-left">
        <DrawerTitle>{listing ? 'Editar publicación' : 'Publicar en un canal'}</DrawerTitle>
        <DrawerDescription>
          Captura lo que te cobra este canal por este producto. VENDORA no asume tarifas.
        </DrawerDescription>
      </DrawerHeader>

      <form onSubmit={guardar} className="space-y-4 px-4 pb-6">
        <div className="space-y-1.5">
          <Label htmlFor="canal">Canal</Label>
          {listing ? (
            <p className="flex h-11 items-center rounded-md border border-neutral-200 px-3 text-sm">
              {canalNombre ?? 'Canal'}
            </p>
          ) : (
            <select
              id="canal"
              value={canalId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setCanalId(e.target.value)}
              className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
            >
              {opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        <Campo id="precio" label="Precio de venta (MXN)" value={precio} onChange={setPrecio} maxLength={13} inputMode="decimal" />
        <div className="grid grid-cols-2 gap-3">
          <Campo id="comision" label="Comisión (%)" value={comision} onChange={setComision} maxLength={7} inputMode="decimal" />
          <Campo id="fijo" label="Cargo fijo (MXN)" value={cargoFijo} onChange={setCargoFijo} maxLength={13} inputMode="decimal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo id="envio" label="Envío o FBA (MXN)" value={envio} onChange={setEnvio} maxLength={13} inputMode="decimal" />
          <Campo id="dias" label="Días a liberación" value={dias} onChange={setDias} maxLength={3} inputMode="numeric" />
        </div>
        <Campo id="externo" label="ID en el canal (ASIN, MLM…) opcional" value={idExterno} onChange={setIdExterno} maxLength={60} />

        <div className="space-y-3">
          <Label>Impuestos de este producto</Label>
          {tiposImpuesto.length === 0 && (
            <p className="text-sm text-neutral-500">Aún no tienes impuestos. Créalos en Más → Impuestos.</p>
          )}
          {tiposImpuesto.map((t) => {
            const e = imp[t.id]
            if (!e) return null
            return (
              <div key={t.id} className="rounded-xl border border-neutral-200 p-3">
                <label className="flex items-center justify-between">
                  <span className="font-medium">{t.nombre}</span>
                  <input
                    type="checkbox"
                    checked={e.on}
                    onChange={(ev: ChangeEvent<HTMLInputElement>) => cambiarImp(t.id, { on: ev.target.checked })}
                    className="size-5"
                  />
                </label>
                {e.on && (
                  <div className="mt-3">
                    <Campo
                      id={`tasa-${t.id}`}
                      label="Tasa (%)"
                      value={e.tasa}
                      onChange={(v) => cambiarImp(t.id, { tasa: v })}
                      maxLength={7}
                      inputMode="decimal"
                    />
                  </div>
                )}
              </div>
            )
          })}
          {tiposImpuesto.length > 0 && (
            <p className="text-xs text-neutral-500">
              Con el IVA marcado, los impuestos se calculan sobre el precio ÷ {(1 + ivaGeneral / 100).toFixed(2)}. Sin
              IVA marcado, sobre el precio completo.
            </p>
          )}
        </div>

        <div className="space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
          {calculo && precioN !== null && fijoN !== null && envioN !== null ? (
            <>
              <Linea etiqueta="Precio de venta" valor={formatMXN(precioN)} clase="" />
              <Linea etiqueta="Comisión" valor={`−${formatMXN(calculo.comision)}`} />
              <Linea etiqueta="Cargo fijo" valor={`−${formatMXN(fijoN)}`} />
              <Linea etiqueta="Envío o FBA" valor={`−${formatMXN(envioN)}`} />
              {aplicados.length > 0 && (
                <Linea
                  etiqueta={
                    aplicaIva
                      ? `Base de impuestos (sin IVA general ${ivaGeneral}%)`
                      : 'Base de impuestos (precio completo)'
                  }
                  valor={formatMXN(calculo.baseImpuestos)}
                  clase="text-xs text-neutral-400"
                />
              )}
              {aplicados.map((a, i) => (
                <Linea
                  key={a.tipo.id}
                  etiqueta={`${a.tipo.nombre} (${a.tasa_pct}%)`}
                  valor={`−${formatMXN(calculo.impuestos[i])}`}
                />
              ))}
              <div className="flex justify-between border-t border-neutral-200 pt-2 font-medium">
                <span>Neto por venta</span>
                <span className={colorNeto}>{formatMXN(calculo.neto)}</span>
              </div>
              <p className="text-xs text-neutral-500">Después de comisión, cargos, envío e impuestos.</p>

              <div className="space-y-2 border-t border-neutral-200 pt-3">
                {costo.valor !== null && resultado ? (
                  <>
                    <Linea
                      etiqueta={
                        costo.origen === 'compras' ? 'Costo promedio (tus compras)' : 'Costo de referencia (estimado)'
                      }
                      valor={`−${formatMXN(costo.valor)}`}
                    />
                    <Linea
                      etiqueta="Utilidad"
                      valor={formatMXN(resultado.utilidad)}
                      clase={resultado.utilidad < 0 ? 'font-medium text-red-600' : 'font-medium text-emerald-600'}
                    />
                    <Linea
                      etiqueta="Margen sobre precio"
                      valor={resultado.margenPct === null ? '—' : `${resultado.margenPct}%`}
                      clase=""
                    />
                    <Linea
                      etiqueta="ROI"
                      valor={resultado.roiPct === null ? '—' : `${resultado.roiPct}%`}
                      clase={
                        resultado.roiPct !== null && resultado.roiPct < 0
                          ? 'font-medium text-red-600'
                          : 'font-medium text-emerald-600'
                      }
                    />
                    {costo.origen === 'referencia' && (
                      <p className="text-xs text-neutral-500">
                        Estimado: se reemplaza por el costo real cuando registres compras.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Captura un costo de referencia para ver utilidad, margen y ROI sin comprar el producto.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-neutral-500">Revisa los números para ver el desglose.</p>
          )}
        </div>

        <div className="space-y-1">
          <Campo
            id="costo-ref"
            label="Costo de referencia por pieza (opcional)"
            value={costoRef}
            onChange={setCostoRef}
            maxLength={13}
            inputMode="decimal"
          />
          <p className="text-xs text-neutral-500">
            Es del producto, no del canal: se comparte en todos. Se usa mientras no tengas compras
            {costoCompras !== null ? '; ahora se usa el costo de tus compras.' : '.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={guardando} className="h-11 w-full">
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar
        </Button>

        {listing &&
          (confirmando ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" className="h-11 flex-1" onClick={eliminar}>
                Sí, quitar
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="h-11 w-full text-red-600" onClick={() => setConfirmando(true)}>
              <Trash2 className="mr-2 size-4" />
              Quitar de este canal
            </Button>
          ))}
      </form>
    </div>
  )
}
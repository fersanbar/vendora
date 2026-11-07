
import { useState, type ChangeEvent } from 'react'
import { Loader2, Package, ArrowDownToLine, ArrowUpFromLine, Scale, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type { LocalProduct, LocalStockAdjustment } from '@/lib/db'
import { hoyLocal } from '@/lib/dates'
import { parseCantidad, parseCosto, parseExistencias } from '@/lib/money'
import { useSync } from '@/features/sync/useSync'
import { ETIQUETA_MOTIVO } from './motivos'
import { saveAdjustment } from './stock.repo'

type Modo = 'agregar' | 'quitar' | 'fijar'
type Motivo = LocalStockAdjustment['motivo']

const FECHA = /^\d{4}-\d{2}-\d{2}$/

const ETIQUETA_MODO: Record<Modo, string> = { agregar: 'Agregar', quitar: 'Quitar', fijar: 'Fijar a' }

const MOTIVOS_POR_MODO: Record<Modo, Motivo[]> = {
  agregar: ['inicial', 'devolucion', 'otro'],
  quitar: ['merma', 'regalo', 'otro'],
  fijar: ['conteo'],
}

interface Props {
  producto: LocalProduct
  stockActual: number
  costoSugerido: number | null
  onDone: () => void
}

export function AjusteStockForm({ producto, stockActual, costoSugerido, onDone }: Props) {
  const { db, syncNow } = useSync()
  const [modo, setModo] = useState<Modo>('agregar')
  const [cantidad, setCantidad] = useState('')
  const [costo, setCosto] = useState(costoSugerido !== null ? String(costoSugerido) : '')
  const [motivo, setMotivo] = useState<Motivo>('inicial')
  const [fecha, setFecha] = useState(hoyLocal())
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cambiarModo(m: Modo) {
    setModo(m)
    setMotivo(MOTIVOS_POR_MODO[m][0])
    setError(null)
  }

  const n = modo === 'fijar' ? parseExistencias(cantidad) : parseCantidad(cantidad)
  const delta = n === null ? null : modo === 'agregar' ? n : modo === 'quitar' ? -n : n - stockActual
  const nuevoStock = delta === null ? null : stockActual + delta
  const mostrarCosto = delta !== null && delta > 0
  const costoN = costo.trim() === '' ? null : parseCosto(costo)
  const costoInvalido = mostrarCosto && costo.trim() !== '' && costoN === null

  async function guardar() {
    if (n === null || delta === null) return setError('Captura una cantidad entera.')
    if (delta === 0) return setError('Ya coincide con tus existencias.')
    if (!FECHA.test(fecha)) return setError('Elige la fecha del ajuste.')
    if (costoInvalido) return setError('Revisa el costo: máximo 4 decimales.')

    setGuardando(true)
    setError(null)
    try {
      await saveAdjustment(db, {
        product_id: producto.id,
        fecha,
        cantidad: delta,
        costo_unitario: delta > 0 ? costoN : null,
        motivo,
        notas: notas.trim() === '' ? null : notas.trim(),
      })
      onDone()
      void syncNow()
    } catch {
      setError('No se pudo guardar el ajuste.')
      setGuardando(false)
    }
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="text-left">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white">
            <Package size={20} />
          </div>
          <span className="text-xs font-bold tracking-[0.16em] text-slate-400">
            VENDORA · INVENTARIO
          </span>
        </div>
        <DrawerTitle className="text-xl font-bold tracking-tight text-slate-900">
          Ajustar existencias
        </DrawerTitle>
        <DrawerDescription className="leading-relaxed text-slate-500">
          {producto.nombre} · hoy tienes {stockActual}. El ajuste queda como un movimiento con fecha y motivo.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-5 px-4 pb-6">
        {/* Tipo de ajuste */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-800">Tipo de ajuste</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['agregar', 'quitar', 'fijar'] as const).map((m) => (
              <Button
                key={m}
                type="button"
                variant={modo === m ? 'default' : 'outline'}
                className={`h-12 rounded-xl font-semibold transition ${
                  modo === m
                    ? 'border-transparent bg-gradient-to-r from-[#172554] to-[#6336a9] text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => cambiarModo(m)}
              >
                {m === 'agregar' && <ArrowDownToLine className="mr-1.5 size-4" />}
                {m === 'quitar' && <ArrowUpFromLine className="mr-1.5 size-4" />}
                {m === 'fijar' && <Scale className="mr-1.5 size-4" />}
                {ETIQUETA_MODO[m]}
              </Button>
            ))}
          </div>
        </div>

        {/* Cantidad */}
        <Campo
          id="cantidad"
          label={modo === 'fijar' ? 'Existencias contadas' : 'Cantidad de piezas'}
          value={cantidad}
          onChange={setCantidad}
          maxLength={6}
          inputMode="numeric"
        />

        {/* Vista previa */}
        {nuevoStock !== null && delta !== 0 && (
          <div className={`rounded-2xl border p-4 ${
            nuevoStock < 0
              ? 'border-rose-200 bg-rose-50'
              : 'border-slate-200 bg-slate-50'
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resultado del ajuste
            </p>
            <p className={`mt-2 text-lg font-bold tabular-nums ${
              nuevoStock < 0 ? 'text-rose-600' : 'text-slate-900'
            }`}>
              Existencias: {stockActual} → {nuevoStock}
              {nuevoStock < 0 ? ' (negativas)' : ''}
            </p>
          </div>
        )}

        {/* Costo */}
        {mostrarCosto && (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
            <Campo
              id="costo"
              label="Costo por pieza (opcional)"
              value={costo}
              onChange={setCosto}
              maxLength={13}
              inputMode="decimal"
            />
            <p className="text-xs leading-relaxed text-slate-500">
              Con costo, estas piezas se mezclan en el costo promedio como una compra. Sin costo, entran al promedio actual sin moverlo.
            </p>
          </div>
        )}

        {/* Motivo */}
        <div className="space-y-1.5">
          <Label htmlFor="motivo" className="text-sm font-semibold text-slate-800">
            Motivo
          </Label>
          <select
            id="motivo"
            value={motivo}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMotivo(e.target.value as Motivo)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            {MOTIVOS_POR_MODO[modo].map((m) => (
              <option key={m} value={m}>
                {ETIQUETA_MOTIVO[m]}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha y notas */}
        <div className="space-y-4">
          <Campo id="fecha" label="Fecha" type="date" value={fecha} onChange={setFecha} maxLength={10} />
          <Campo id="notas" label="Notas (opcional)" value={notas} onChange={setNotas} maxLength={1000} />
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="button"
          onClick={() => void guardar()}
          disabled={guardando}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] font-semibold shadow-md shadow-indigo-950/10 transition hover:opacity-95"
        >
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar ajuste
        </Button>
      </div>
    </div>
  )
}

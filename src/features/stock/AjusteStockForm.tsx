import { useState, type ChangeEvent } from 'react'
import { Loader2 } from 'lucide-react'
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
        <DrawerTitle>Ajustar existencias</DrawerTitle>
        <DrawerDescription>
          {producto.nombre} · hoy tienes {stockActual}. El ajuste queda como un movimiento con fecha y motivo.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="grid grid-cols-3 gap-2">
          {(['agregar', 'quitar', 'fijar'] as const).map((m) => (
            <Button
              key={m}
              type="button"
              variant={modo === m ? 'default' : 'outline'}
              className="h-11"
              onClick={() => cambiarModo(m)}
            >
              {ETIQUETA_MODO[m]}
            </Button>
          ))}
        </div>

        <Campo
          id="cantidad"
          label={modo === 'fijar' ? 'Existencias contadas' : 'Cantidad de piezas'}
          value={cantidad}
          onChange={setCantidad}
          maxLength={6}
          inputMode="numeric"
        />

        {nuevoStock !== null && delta !== 0 && (
          <p className={`text-sm font-medium ${nuevoStock < 0 ? 'text-red-600' : ''}`}>
            Existencias: {stockActual} → {nuevoStock}
            {nuevoStock < 0 ? ' (negativas)' : ''}
          </p>
        )}

        {mostrarCosto && (
          <div className="space-y-1">
            <Campo
              id="costo"
              label="Costo por pieza (opcional)"
              value={costo}
              onChange={setCosto}
              maxLength={13}
              inputMode="decimal"
            />
            <p className="text-xs text-neutral-500">
              Con costo, estas piezas se mezclan en el costo promedio como una compra. Sin costo, entran al promedio
              actual sin moverlo.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="motivo">Motivo</Label>
          <select
            id="motivo"
            value={motivo}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMotivo(e.target.value as Motivo)}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
          >
            {MOTIVOS_POR_MODO[modo].map((m) => (
              <option key={m} value={m}>
                {ETIQUETA_MOTIVO[m]}
              </option>
            ))}
          </select>
        </div>

        <Campo id="fecha" label="Fecha" type="date" value={fecha} onChange={setFecha} maxLength={10} />
        <Campo id="notas" label="Notas (opcional)" value={notas} onChange={setNotas} maxLength={1000} />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="button" onClick={() => void guardar()} disabled={guardando} className="h-11 w-full">
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar ajuste
        </Button>
      </div>
    </div>
  )
}
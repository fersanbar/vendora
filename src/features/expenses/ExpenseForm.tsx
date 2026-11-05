import { useState, type ChangeEvent } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type { LocalExpense, LocalExpenseCategory } from '@/lib/db'
import { hoyLocal } from '@/lib/dates'
import { parseMonto } from '@/lib/money'
import { METODOS_PAGO } from '@/features/purchases/metodos'
import { useSync } from '@/features/sync/useSync'
import { deleteExpense, saveExpense } from './expenses.repo'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

interface Props {
  gasto: LocalExpense | null
  categorias: LocalExpenseCategory[]
  onDone: () => void
}

export function ExpenseForm({ gasto, categorias, onDone }: Props) {
  const { db, syncNow } = useSync()
  const [fecha, setFecha] = useState(gasto?.fecha ?? hoyLocal())
  const [monto, setMonto] = useState(gasto ? String(gasto.monto) : '')
  const [categoriaId, setCategoriaId] = useState(gasto?.category_id ?? '')
  const [metodo, setMetodo] = useState<LocalExpense['metodo_pago']>(gasto?.metodo_pago ?? 'efectivo')
  const [concepto, setConcepto] = useState(gasto?.concepto ?? '')
  const [notas, setNotas] = useState(gasto?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const opciones = categorias
    .filter((c) => c.activo || c.id === gasto?.category_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  async function guardar() {
    const montoN = parseMonto(monto)
    if (!FECHA.test(fecha)) return setError('Elige la fecha del gasto.')
    if (montoN === null || montoN <= 0) return setError('Captura un monto mayor a 0, con máximo 2 decimales.')

    setGuardando(true)
    setError(null)
    try {
      await saveExpense(
        db,
        {
          category_id: categoriaId === '' ? null : categoriaId,
          fecha,
          monto: montoN,
          metodo_pago: metodo,
          concepto: concepto.trim() === '' ? null : concepto.trim(),
          notas: notas.trim() === '' ? null : notas.trim(),
        },
        gasto?.id,
      )
      onDone()
      void syncNow()
    } catch {
      setError('No se pudo guardar el gasto.')
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!gasto) return
    await deleteExpense(db, gasto.id)
    onDone()
    void syncNow()
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="text-left">
        <DrawerTitle>{gasto ? 'Editar gasto' : 'Nuevo gasto'}</DrawerTitle>
        <DrawerDescription>Lo que pagas fuera del producto que revendes. La mercancía va en Compras.</DrawerDescription>
      </DrawerHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <Campo id="fecha" label="Fecha" type="date" value={fecha} onChange={setFecha} maxLength={10} />
          <Campo id="monto" label="Monto (MXN)" value={monto} onChange={setMonto} maxLength={13} inputMode="decimal" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoria">Categoría</Label>
          <select
            id="categoria"
            value={categoriaId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoriaId(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
          >
            <option value="">Sin categoría</option>
            {opciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="metodo">Método de pago</Label>
          <select
            id="metodo"
            value={metodo}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMetodo(e.target.value as LocalExpense['metodo_pago'])}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
          >
            {METODOS_PAGO.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <Campo id="concepto" label="Concepto (opcional)" value={concepto} onChange={setConcepto} maxLength={120} />
        <Campo id="notas" label="Notas (opcional)" value={notas} onChange={setNotas} maxLength={1000} />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="button" onClick={() => void guardar()} disabled={guardando} className="h-11 w-full">
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar
        </Button>

        {gasto &&
          (confirmando ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" className="h-11 flex-1" onClick={() => void eliminar()}>
                Sí, eliminar
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="h-11 w-full text-red-600" onClick={() => setConfirmando(true)}>
              <Trash2 className="mr-2 size-4" />
              Eliminar gasto
            </Button>
          ))}
      </div>
    </div>
  )
}
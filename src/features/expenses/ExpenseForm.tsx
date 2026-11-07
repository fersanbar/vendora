
import { useState, type ChangeEvent } from 'react'
import {
  Loader2,
  Trash2,
  ReceiptText,
  Wallet,
  Tag,
  CreditCard,
  Info,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type {
  LocalExpense,
  LocalExpenseCategory,
} from '@/lib/db'
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

const selectClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100'

export function ExpenseForm({
  gasto,
  categorias,
  onDone,
}: Props) {
  const { db, syncNow } = useSync()

  const [fecha, setFecha] = useState(gasto?.fecha ?? hoyLocal())
  const [monto, setMonto] = useState(
    gasto ? String(gasto.monto) : '',
  )
  const [categoriaId, setCategoriaId] = useState(
    gasto?.category_id ?? '',
  )
  const [metodo, setMetodo] = useState<
    LocalExpense['metodo_pago']
  >(gasto?.metodo_pago ?? 'efectivo')
  const [concepto, setConcepto] = useState(gasto?.concepto ?? '')
  const [notas, setNotas] = useState(gasto?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const opciones = categorias
    .filter((c) => c.activo || c.id === gasto?.category_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  async function guardar() {
    const montoN = parseMonto(monto)

    if (!FECHA.test(fecha)) {
      setError('Elige la fecha del gasto.')
      return
    }

    if (montoN === null || montoN <= 0) {
      setError(
        'Captura un monto mayor a 0, con máximo 2 decimales.',
      )
      return
    }

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
    if (!gasto || eliminando) return

    setEliminando(true)
    setError(null)

    try {
      await deleteExpense(db, gasto.id)
      onDone()
      void syncNow()
    } catch {
      setError('No se pudo eliminar el gasto.')
      setEliminando(false)
    }
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto bg-slate-50/70">
      {/* Encabezado */}
      <DrawerHeader className="border-b border-slate-200 bg-white px-5 pb-5 pt-5 text-left">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <ReceiptText className="size-5" />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-violet-600">
              VENDORA
            </p>
            <p className="text-xs text-slate-400">
              Control de gastos
            </p>
          </div>
        </div>

        <DrawerTitle className="text-xl font-bold tracking-tight text-slate-900">
          {gasto ? 'Editar gasto' : 'Nuevo gasto'}
        </DrawerTitle>

        <DrawerDescription className="mt-1 text-sm leading-relaxed text-slate-500">
          Registra los gastos operativos de tu negocio y mantén tus
          finanzas organizadas.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-5 px-5 pb-8 pt-5">
        {/* Información del gasto */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Información del gasto
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="fecha"
              label="Fecha"
              type="date"
              value={fecha}
              onChange={setFecha}
              maxLength={10}
            />

            <Campo
              id="monto"
              label="Monto (MXN)"
              value={monto}
              onChange={setMonto}
              maxLength={13}
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="concepto"
              className="text-sm font-semibold text-slate-700"
            >
              Concepto (opcional)
            </Label>

            <Campo
              id="concepto"
              label=""
              value={concepto}
              onChange={setConcepto}
              maxLength={120}
            />
          </div>
        </section>

        {/* Clasificación */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Clasificación
            </h3>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="categoria"
              className="text-sm font-semibold text-slate-700"
            >
              Categoría
            </Label>

            <select
              id="categoria"
              value={categoriaId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setCategoriaId(e.target.value)
              }
              className={selectClass}
            >
              <option value="">Sin categoría</option>

              {opciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="metodo"
              className="text-sm font-semibold text-slate-700"
            >
              Método de pago
            </Label>

            <div className="relative">
              <CreditCard className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <select
                id="metodo"
                value={metodo}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setMetodo(
                    e.target.value as LocalExpense['metodo_pago'],
                  )
                }
                className={`${selectClass} pl-10`}
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Notas */}
        <section className="space-y-2">
          <Label
            htmlFor="notas"
            className="text-sm font-semibold text-slate-700"
          >
            Notas adicionales (opcional)
          </Label>

          <Campo
            id="notas"
            label=""
            value={notas}
            onChange={setNotas}
            maxLength={1000}
          />
        </section>

        {/* Información */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-500">
            Los gastos operativos se registran aquí. Las compras de
            mercancía para reventa deben registrarse en la sección
            Compras para mantener separado el costo del inventario.
          </p>
        </div>

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="space-y-3 border-t border-slate-200 pt-5">
          <Button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || eliminando}
            className="h-12 w-full rounded-xl bg-[#172554] text-sm font-semibold text-white shadow-md shadow-indigo-950/10 transition hover:bg-[#263b78]"
          >
            {guardando ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando...
              </>
            ) : (
              gasto ? 'Guardar cambios' : 'Registrar gasto'
            )}
          </Button>

          {gasto &&
            (confirmando ? (
              <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-rose-800">
                  ¿Eliminar este gasto?
                </p>

                <p className="text-xs text-rose-700">
                  Esta acción eliminará el registro de tus gastos.
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-xl border-slate-200 bg-white"
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
                    {eliminando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Sí, eliminar'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                disabled={guardando}
                onClick={() => setConfirmando(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Eliminar gasto
              </Button>
            ))}
        </div>
      </div>
    </div>
  )
}

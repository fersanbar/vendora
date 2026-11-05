import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Plus, Settings2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { NavegadorMes } from '@/components/NavegadorMes'
import type { LocalExpense } from '@/lib/db'
import { formatearFecha, periodoActual } from '@/lib/dates'
import { formatMXN, sumar } from '@/lib/money'
import { etiquetaMetodo } from '@/features/purchases/metodos'
import { SyncStatus } from '@/features/sync/SyncStatus'
import { useSync } from '@/features/sync/useSync'
import { ExpenseForm } from './ExpenseForm'

export function ExpensesPage() {
  const { db } = useSync()
  const [periodo, setPeriodo] = useState(periodoActual())
  const [abierto, setAbierto] = useState(false)
  const [seleccionado, setSeleccionado] = useState<LocalExpense | null>(null)

  const datos = useLiveQuery(async () => {
    const categorias = (await db.expense_categories.toArray()).filter((c) => c.deleted_at === null)
    const gastos = (await db.expenses.toArray()).filter((g) => g.deleted_at === null)
    return { categorias, gastos }
  }, [db])

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
  }

  const { categorias, gastos } = datos
  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]))
  const delMes = gastos
    .filter((g) => g.fecha.startsWith(periodo))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at))
  const totalMes = sumar(delMes.map((g) => g.monto))

  function abrir(g: LocalExpense | null) {
    setSeleccionado(g)
    setAbierto(true)
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <Link to="/finanzas" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Finanzas
      </Link>
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
        <SyncStatus />
      </div>

      <Link
        to="/finanzas/gastos/categorias"
        className="mt-3 inline-flex items-center gap-2 text-sm text-neutral-500 underline-offset-4 hover:underline"
      >
        <Settings2 className="size-4" /> Categorías
      </Link>

      <div className="mt-4 rounded-xl border border-neutral-200 p-4">
        <p className="text-xs text-neutral-500">Gastos del mes</p>
        <p className="mt-1 text-lg font-semibold">{formatMXN(totalMes)}</p>
      </div>

      <div className="mt-6">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="mt-4 space-y-2">
        {delMes.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <Wallet className="mx-auto size-8 text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-500">Sin gastos en este mes.</p>
            <Button className="mt-4" onClick={() => abrir(null)}>
              Registrar un gasto
            </Button>
          </div>
        )}

        {delMes.map((g) => (
          <button
            key={g.id}
            onClick={() => abrir(g)}
            className="flex min-h-16 w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-2 text-left"
          >
            <div>
              <p className="font-medium">{g.concepto ?? (g.category_id ? nombreCategoria.get(g.category_id) : null) ?? 'Gasto'}</p>
              <p className="text-xs text-neutral-500">
                {formatearFecha(g.fecha)} · {g.category_id ? (nombreCategoria.get(g.category_id) ?? 'Categoría') : 'Sin categoría'} ·{' '}
                {etiquetaMetodo(g.metodo_pago)}
              </p>
            </div>
            <span className="font-medium">{formatMXN(g.monto)}</span>
          </button>
        ))}
      </div>

      <Button
        onClick={() => abrir(null)}
        className="fixed right-4 z-20 size-14 rounded-full shadow-lg bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
        aria-label="Registrar gasto"
      >
        <Plus className="size-6" />
      </Button>

      <Drawer open={abierto} onOpenChange={setAbierto}>
        <DrawerContent>
          <ExpenseForm
            key={seleccionado?.id ?? 'nuevo'}
            gasto={seleccionado}
            categorias={categorias}
            onDone={() => setAbierto(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronLeft,
  Plus,
  Settings2,
  Wallet,
  ReceiptText,
  CalendarDays,
  ArrowUpRight,
  Tag,
  ChevronRight,
} from 'lucide-react'

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
  const [seleccionado, setSeleccionado] =
    useState<LocalExpense | null>(null)

  const datos = useLiveQuery(async () => {
    const categorias = (
      await db.expense_categories.toArray()
    ).filter((c) => c.deleted_at === null)

    const gastos = (
      await db.expenses.toArray()
    ).filter((g) => g.deleted_at === null)

    return { categorias, gastos }
  }, [db])

  function abrir(gasto: LocalExpense | null) {
    setSeleccionado(gasto)
    setAbierto(true)
  }

  if (datos === undefined) {
    return (
      <div className="min-h-full bg-slate-50/70 px-4 pb-8 pt-4 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>
    )
  }

  const { categorias, gastos } = datos

  const nombreCategoria = new Map(
    categorias.map((c) => [c.id, c.nombre]),
  )

  const delMes = gastos
    .filter((g) => g.fecha.startsWith(periodo))
    .sort(
      (a, b) =>
        b.fecha.localeCompare(a.fecha) ||
        b.created_at.localeCompare(a.created_at),
    )

  const totalMes = sumar(delMes.map((g) => g.monto))

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Navegación */}
        <Link
          to="/finanzas"
          className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-violet-600"
        >
          <ChevronLeft className="size-4" />
          Finanzas
        </Link>

        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <ReceiptText className="size-6" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Gastos
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Controla los gastos de tu negocio.
              </p>
            </div>
          </div>

          <SyncStatus />
        </div>

        {/* Categorías */}
        <Link
          to="/finanzas/gastos/categorias"
          className="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-500 transition hover:text-violet-600"
        >
          <Settings2 className="size-4" />
          Administrar categorías
          <ArrowUpRight className="size-3.5" />
        </Link>

        {/* Resumen */}
        <section className="mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#172554] via-[#202F69] to-[#6336A9] p-5 text-white shadow-lg shadow-indigo-950/10 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-100">
                Gastos del periodo
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                {formatMXN(totalMes)}
              </p>

              <p className="mt-2 text-xs text-indigo-200">
                Total registrado durante el mes seleccionado
              </p>
            </div>

            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/10">
              <Wallet className="size-6 text-violet-200" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <ReceiptText className="size-4 text-indigo-100" />
            </div>

            <div>
              <p className="text-sm font-semibold">
                {delMes.length} {delMes.length === 1 ? 'movimiento' : 'movimientos'}
              </p>
              <p className="text-xs text-indigo-200">
                Gastos registrados
              </p>
            </div>
          </div>
        </section>

        {/* Periodo */}
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="size-4 text-violet-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Historial de gastos
            </h2>
          </div>

          <NavegadorMes
            periodo={periodo}
            onChange={setPeriodo}
          />
        </section>

        {/* Lista */}
        <section className="mt-4">
          {delMes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Wallet className="size-7" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-900">
                Sin gastos en este periodo
              </h3>

              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                Cuando registres un gasto, aparecerá aquí para que puedas
                consultar y controlar tus movimientos.
              </p>

              <Button
                type="button"
                onClick={() => abrir(null)}
                className="mt-5 h-10 rounded-xl bg-[#172554] px-5 text-white hover:bg-[#263b78]"
              >
                <Plus className="mr-2 size-4" />
                Registrar un gasto
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  Movimientos del periodo
                </p>
                <span className="text-xs font-medium text-slate-400">
                  {delMes.length} registros
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {delMes.map((g) => {
                  const categoria = g.category_id
                    ? nombreCategoria.get(g.category_id) ?? 'Categoría'
                    : 'Sin categoría'

                  const concepto =
                    g.concepto ??
                    (g.category_id
                      ? nombreCategoria.get(g.category_id)
                      : null) ??
                    'Gasto'

                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => abrir(g)}
                      className="flex min-h-[76px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-violet-50 group-hover:text-violet-600">
                          <Tag className="size-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {concepto}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {formatearFecha(g.fecha)} · {categoria}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {etiquetaMetodo(g.metodo_pago)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-bold tabular-nums text-slate-800">
                          {formatMXN(g.monto)}
                        </span>

                        <ChevronRight className="size-4 text-slate-300" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Botón flotante */}
      {delMes.length > 0 && (
        <Button
          type="button"
          onClick={() => abrir(null)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-14 rounded-2xl bg-gradient-to-br from-[#172554] to-[#6336A9] text-white shadow-lg shadow-indigo-950/20 transition hover:scale-105 hover:from-[#263b78] hover:to-violet-700 sm:right-8"
          aria-label="Registrar gasto"
        >
          <Plus className="size-6" />
        </Button>
      )}

      {/* Formulario */}
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

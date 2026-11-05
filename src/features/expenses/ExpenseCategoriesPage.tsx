import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ChevronLeft, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LocalExpenseCategory } from '@/lib/db'
import { useSync } from '@/features/sync/useSync'
import { createCategory, deleteCategory, setCategoryActive } from './expenses.repo'

export function ExpenseCategoriesPage() {
  const { db, syncNow } = useSync()
  const [nuevo, setNuevo] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const categorias = useLiveQuery(
    async () =>
      (await db.expense_categories.toArray())
        .filter((c) => c.deleted_at === null)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [db],
  )

  async function agregar(e: FormEvent) {
    e.preventDefault()
    if (!nuevo.trim()) return
    setAgregando(true)
    setError(null)
    try {
      await createCategory(db, nuevo)
      setNuevo('')
      void syncNow()
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'NOMBRE_DUPLICADO'
          ? 'Ya tienes una categoría con ese nombre.'
          : 'No se pudo agregar la categoría.',
      )
    }
    setAgregando(false)
  }

  async function alternar(c: LocalExpenseCategory) {
    setError(null)
    await setCategoryActive(db, c.id, !c.activo)
    void syncNow()
  }

  async function eliminar(c: LocalExpenseCategory) {
    setError(null)
    try {
      await deleteCategory(db, c.id)
      void syncNow()
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'CATEGORIA_EN_USO'
          ? 'Esta categoría ya tiene gastos. Déjala archivada para conservar tu historial.'
          : 'No se pudo eliminar la categoría.',
      )
    }
    setConfirmando(null)
  }

  function fila(c: LocalExpenseCategory) {
    if (confirmando === c.id) {
      return (
        <li key={c.id} className="flex h-14 items-center justify-between gap-2 px-4">
          <span className="truncate text-sm">¿Eliminar {c.nombre}?</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void eliminar(c)}>
              Eliminar
            </Button>
          </div>
        </li>
      )
    }
    return (
      <li key={c.id} className={`flex h-14 items-center justify-between px-4 ${c.activo ? '' : 'text-neutral-400'}`}>
        <span>{c.nombre}</span>
        <div className="flex">
          <button
            onClick={() => void alternar(c)}
            className="flex size-10 items-center justify-center text-neutral-400"
            aria-label={`${c.activo ? 'Archivar' : 'Restaurar'} ${c.nombre}`}
          >
            {c.activo ? <Archive className="size-5" /> : <RotateCcw className="size-5" />}
          </button>
          <button
            onClick={() => setConfirmando(c.id)}
            className="flex size-10 items-center justify-center text-red-500"
            aria-label={`Eliminar ${c.nombre}`}
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </li>
    )
  }

  const activas = categorias?.filter((c) => c.activo) ?? []
  const archivadas = categorias?.filter((c) => !c.activo) ?? []

  return (
    <div className="px-4 pb-6 pt-4">
      <Link to="/finanzas/gastos" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Gastos
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Categorías de gasto</h1>

      <form onSubmit={(e) => void agregar(e)} className="mt-5 flex gap-2">
        <Input
          value={nuevo}
          maxLength={60}
          placeholder="Nueva categoría (ej. Papelería)"
          className="h-11"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNuevo(e.target.value)}
        />
        <Button type="submit" disabled={agregando || !nuevo.trim()} className="h-11 px-4">
          {agregando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <span className="sr-only">Agregar categoría</span>
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <ul className="mt-5 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {activas.map(fila)}
        {categorias && activas.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">
            No tienes categorías activas. Si acabas de actualizar, conéctate a internet para descargar las iniciales.
          </li>
        )}
      </ul>

      {archivadas.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-neutral-500">Archivadas</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {archivadas.map(fila)}
          </ul>
        </>
      )}
    </div>
  )
}
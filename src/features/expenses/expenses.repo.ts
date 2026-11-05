import type { LocalExpense, LocalExpenseCategory, VendoraDB } from '@/lib/db'

export interface ExpenseInput {
  category_id: string | null
  fecha: string
  monto: number
  metodo_pago: LocalExpense['metodo_pago']
  concepto: string | null
  notas: string | null
}

// Solo columnas escribibles: user_id y updated_at los pone el servidor
function categoriaPayload(c: LocalExpenseCategory) {
  return { id: c.id, nombre: c.nombre, activo: c.activo, deleted_at: c.deleted_at, created_at: c.created_at }
}

function gastoPayload(g: LocalExpense) {
  return {
    id: g.id,
    category_id: g.category_id,
    fecha: g.fecha,
    monto: g.monto,
    metodo_pago: g.metodo_pago,
    concepto: g.concepto,
    notas: g.notas,
    deleted_at: g.deleted_at,
    created_at: g.created_at,
  }
}

export async function createCategory(db: VendoraDB, nombre: string): Promise<void> {
  const limpio = nombre.trim()
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.expense_categories, db.outbox, async () => {
    const repetida = await db.expense_categories
      .filter((c) => c.deleted_at === null && c.nombre.toLowerCase() === limpio.toLowerCase())
      .first()
    if (repetida) throw new Error('NOMBRE_DUPLICADO')

    const fila: LocalExpenseCategory = {
      id: crypto.randomUUID(),
      nombre: limpio,
      activo: true,
      deleted_at: null,
      created_at: ahora,
      updated_at: ahora,
    }
    await db.expense_categories.put(fila)
    await db.outbox.add({ table: 'expense_categories', rowId: fila.id, payload: categoriaPayload(fila), createdAt: ahora })
  })
}

export async function setCategoryActive(db: VendoraDB, id: string, activo: boolean): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.expense_categories, db.outbox, async () => {
    const existente = await db.expense_categories.get(id)
    if (!existente) return
    const fila: LocalExpenseCategory = { ...existente, activo, updated_at: ahora }
    await db.expense_categories.put(fila)
    await db.outbox.add({ table: 'expense_categories', rowId: id, payload: categoriaPayload(fila), createdAt: ahora })
  })
}

// Una categoría con gastos no se elimina: se archiva
export async function deleteCategory(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.expense_categories, db.expenses, db.outbox, async () => {
    const enUso = await db.expenses
      .where('category_id')
      .equals(id)
      .filter((g) => g.deleted_at === null)
      .first()
    if (enUso) throw new Error('CATEGORIA_EN_USO')

    const existente = await db.expense_categories.get(id)
    if (!existente) return
    const fila: LocalExpenseCategory = { ...existente, deleted_at: ahora, updated_at: ahora }
    await db.expense_categories.put(fila)
    await db.outbox.add({ table: 'expense_categories', rowId: id, payload: categoriaPayload(fila), createdAt: ahora })
  })
}

export async function saveExpense(db: VendoraDB, input: ExpenseInput, id?: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.expenses, db.outbox, async () => {
    const existente = id ? await db.expenses.get(id) : undefined
    const fila: LocalExpense = existente
      ? { ...existente, ...input, updated_at: ahora }
      : { id: crypto.randomUUID(), ...input, deleted_at: null, created_at: ahora, updated_at: ahora }
    await db.expenses.put(fila)
    await db.outbox.add({ table: 'expenses', rowId: fila.id, payload: gastoPayload(fila), createdAt: ahora })
  })
}

export async function deleteExpense(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.expenses, db.outbox, async () => {
    const existente = await db.expenses.get(id)
    if (!existente) return
    const fila: LocalExpense = { ...existente, deleted_at: ahora, updated_at: ahora }
    await db.expenses.put(fila)
    await db.outbox.add({ table: 'expenses', rowId: id, payload: gastoPayload(fila), createdAt: ahora })
  })
}
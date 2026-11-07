import type { LocalStockAdjustment, VendoraDB } from '@/lib/db'

export interface AjusteInput {
  product_id: string
  fecha: string
  cantidad: number
  costo_unitario: number | null
  motivo: LocalStockAdjustment['motivo']
  notas: string | null
}

// Solo columnas escribibles: user_id y updated_at los pone el servidor
function ajustePayload(a: LocalStockAdjustment) {
  return {
    id: a.id,
    product_id: a.product_id,
    fecha: a.fecha,
    cantidad: a.cantidad,
    costo_unitario: a.costo_unitario,
    motivo: a.motivo,
    notas: a.notas,
    deleted_at: a.deleted_at,
    created_at: a.created_at,
  }
}

// Los ajustes son movimientos: no se editan, se agregan o se borran
export async function saveAdjustment(db: VendoraDB, input: AjusteInput): Promise<void> {
  const ahora = new Date().toISOString()
  const fila: LocalStockAdjustment = {
    id: crypto.randomUUID(),
    ...input,
    costo_unitario: input.cantidad > 0 ? input.costo_unitario : null,
    deleted_at: null,
    created_at: ahora,
    updated_at: ahora,
  }
  await db.transaction('rw', db.stock_adjustments, db.outbox, async () => {
    await db.stock_adjustments.put(fila)
    await db.outbox.add({
      table: 'stock_adjustments',
      rowId: fila.id,
      payload: ajustePayload(fila),
      createdAt: ahora,
    })
  })
}

export async function deleteAdjustment(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.stock_adjustments, db.outbox, async () => {
    const existente = await db.stock_adjustments.get(id)
    if (!existente) return
    const fila: LocalStockAdjustment = { ...existente, deleted_at: ahora, updated_at: ahora }
    await db.stock_adjustments.put(fila)
    await db.outbox.add({
      table: 'stock_adjustments',
      rowId: id,
      payload: ajustePayload(fila),
      createdAt: ahora,
    })
  })
}
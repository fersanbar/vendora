import type { LocalSale, VendoraDB } from '@/lib/db'
import { hoyLocal } from '@/lib/dates'

export interface SaleInput {
  product_id: string
  channel_id: string
  fecha: string
  cantidad: number
  precio_unitario: number
  comision: number
  cargo_fijo: number
  costo_envio: number
  impuestos: number
  costo_unitario: number | null
  estado_cobro: LocalSale['estado_cobro']
  fecha_liberacion_estimada: string | null
  fecha_liberacion_real: string | null
  id_orden: string | null
  notas: string | null
}

// Solo columnas escribibles: user_id y updated_at los pone el servidor
function ventaPayload(v: LocalSale) {
  return {
    id: v.id,
    product_id: v.product_id,
    channel_id: v.channel_id,
    fecha: v.fecha,
    cantidad: v.cantidad,
    precio_unitario: v.precio_unitario,
    comision: v.comision,
    cargo_fijo: v.cargo_fijo,
    costo_envio: v.costo_envio,
    impuestos: v.impuestos,
    costo_unitario: v.costo_unitario,
    estado_cobro: v.estado_cobro,
    fecha_liberacion_estimada: v.fecha_liberacion_estimada,
    fecha_liberacion_real: v.fecha_liberacion_real,
    id_orden: v.id_orden,
    notas: v.notas,
    deleted_at: v.deleted_at,
    created_at: v.created_at,
  }
}

export async function saveSale(db: VendoraDB, input: SaleInput, id?: string): Promise<void> {
  const ahora = new Date().toISOString()
  const datos: SaleInput = {
    ...input,
    fecha_liberacion_real:
      input.estado_cobro === 'liberado' ? (input.fecha_liberacion_real ?? hoyLocal()) : null,
  }

  await db.transaction('rw', db.sales, db.outbox, async () => {
    if (datos.id_orden) {
      const orden = datos.id_orden.toLowerCase()
      const repetida = await db.sales
        .filter(
          (v) =>
            v.deleted_at === null &&
            v.id !== id &&
            v.channel_id === datos.channel_id &&
            v.product_id === datos.product_id &&
            v.id_orden?.toLowerCase() === orden,
        )
        .first()
      if (repetida) throw new Error('ORDEN_DUPLICADA')
    }

    const existente = id ? await db.sales.get(id) : undefined
    const fila: LocalSale = existente
      ? { ...existente, ...datos, updated_at: ahora }
      : { id: crypto.randomUUID(), ...datos, deleted_at: null, created_at: ahora, updated_at: ahora }

    await db.sales.put(fila)
    await db.outbox.add({ table: 'sales', rowId: fila.id, payload: ventaPayload(fila), createdAt: ahora })
  })
}

export async function markSaleReleased(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.sales, db.outbox, async () => {
    const existente = await db.sales.get(id)
    if (!existente) return
    const fila: LocalSale = {
      ...existente,
      estado_cobro: 'liberado',
      fecha_liberacion_real: hoyLocal(),
      updated_at: ahora,
    }
    await db.sales.put(fila)
    await db.outbox.add({ table: 'sales', rowId: id, payload: ventaPayload(fila), createdAt: ahora })
  })
}

export async function deleteSale(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.sales, db.outbox, async () => {
    const existente = await db.sales.get(id)
    if (!existente) return
    const fila: LocalSale = { ...existente, deleted_at: ahora, updated_at: ahora }
    await db.sales.put(fila)
    await db.outbox.add({ table: 'sales', rowId: id, payload: ventaPayload(fila), createdAt: ahora })
  })
}
import type { LocalSale, LocalSaleItem, VendoraDB } from '@/lib/db'
import { hoyLocal } from '@/lib/dates'

export interface SaleInput {
  channel_id: string
  fecha: string
  costo_envio: number
  impuestos: number
  estado_cobro: LocalSale['estado_cobro']
  fecha_liberacion_estimada: string | null
  fecha_liberacion_real: string | null
  id_orden: string | null
  notas: string | null
}

export interface SaleLineInput {
  id?: string
  product_id: string
  cantidad: number
  precio_unitario: number
  comision: number
  cargo_fijo: number
  costo_unitario: number | null
}

// Solo columnas escribibles: user_id y updated_at los pone el servidor
function ventaPayload(v: LocalSale) {
  return {
    id: v.id,
    channel_id: v.channel_id,
    fecha: v.fecha,
    costo_envio: v.costo_envio,
    impuestos: v.impuestos,
    estado_cobro: v.estado_cobro,
    fecha_liberacion_estimada: v.fecha_liberacion_estimada,
    fecha_liberacion_real: v.fecha_liberacion_real,
    id_orden: v.id_orden,
    notas: v.notas,
    deleted_at: v.deleted_at,
    created_at: v.created_at,
  }
}

function lineaPayload(i: LocalSaleItem) {
  return {
    id: i.id,
    sale_id: i.sale_id,
    product_id: i.product_id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    comision: i.comision,
    cargo_fijo: i.cargo_fijo,
    costo_unitario: i.costo_unitario,
    deleted_at: i.deleted_at,
    created_at: i.created_at,
  }
}

export async function saveSale(
  db: VendoraDB,
  input: SaleInput,
  lineas: SaleLineInput[],
  id?: string,
): Promise<void> {
  if (lineas.length === 0) throw new Error('SIN_PRODUCTOS')
  const ahora = new Date().toISOString()
  const datos: SaleInput = {
    ...input,
    fecha_liberacion_real:
      input.estado_cobro === 'liberado' ? (input.fecha_liberacion_real ?? hoyLocal()) : null,
  }

  await db.transaction('rw', db.sales, db.sale_items, db.outbox, async () => {
    if (datos.id_orden) {
      const orden = datos.id_orden.toLowerCase()
      const repetida = await db.sales
        .filter(
          (v) =>
            v.deleted_at === null &&
            v.id !== id &&
            v.channel_id === datos.channel_id &&
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

    // Líneas: actualizar las que cambiaron, crear las nuevas, quitar las eliminadas
    const previas = await db.sale_items.where('sale_id').equals(fila.id).toArray()
    const porId = new Map(previas.map((i) => [i.id, i]))
    const conservadas = new Set<string>()

    for (const l of lineas) {
      const previa = l.id ? porId.get(l.id) : undefined
      if (previa) {
        conservadas.add(previa.id)
        if (
          previa.deleted_at === null &&
          previa.product_id === l.product_id &&
          previa.cantidad === l.cantidad &&
          previa.precio_unitario === l.precio_unitario &&
          previa.comision === l.comision &&
          previa.cargo_fijo === l.cargo_fijo &&
          previa.costo_unitario === l.costo_unitario
        ) {
          continue
        }
        const actualizada: LocalSaleItem = {
          ...previa,
          product_id: l.product_id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          comision: l.comision,
          cargo_fijo: l.cargo_fijo,
          costo_unitario: l.costo_unitario,
          deleted_at: null,
          updated_at: ahora,
        }
        await db.sale_items.put(actualizada)
        await db.outbox.add({ table: 'sale_items', rowId: actualizada.id, payload: lineaPayload(actualizada), createdAt: ahora })
      } else {
        const nueva: LocalSaleItem = {
          id: crypto.randomUUID(),
          sale_id: fila.id,
          product_id: l.product_id,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          comision: l.comision,
          cargo_fijo: l.cargo_fijo,
          costo_unitario: l.costo_unitario,
          deleted_at: null,
          created_at: ahora,
          updated_at: ahora,
        }
        await db.sale_items.put(nueva)
        await db.outbox.add({ table: 'sale_items', rowId: nueva.id, payload: lineaPayload(nueva), createdAt: ahora })
      }
    }

    for (const previa of previas) {
      if (previa.deleted_at === null && !conservadas.has(previa.id)) {
        const borrada: LocalSaleItem = { ...previa, deleted_at: ahora, updated_at: ahora }
        await db.sale_items.put(borrada)
        await db.outbox.add({ table: 'sale_items', rowId: previa.id, payload: lineaPayload(borrada), createdAt: ahora })
      }
    }
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
  await db.transaction('rw', db.sales, db.sale_items, db.outbox, async () => {
    const existente = await db.sales.get(id)
    if (!existente) return

    const lineas = await db.sale_items
      .where('sale_id')
      .equals(id)
      .filter((i) => i.deleted_at === null)
      .toArray()
    for (const l of lineas) {
      const borrada: LocalSaleItem = { ...l, deleted_at: ahora, updated_at: ahora }
      await db.sale_items.put(borrada)
      await db.outbox.add({ table: 'sale_items', rowId: l.id, payload: lineaPayload(borrada), createdAt: ahora })
    }

    const fila: LocalSale = { ...existente, deleted_at: ahora, updated_at: ahora }
    await db.sales.put(fila)
    await db.outbox.add({ table: 'sales', rowId: id, payload: ventaPayload(fila), createdAt: ahora })
  })
}
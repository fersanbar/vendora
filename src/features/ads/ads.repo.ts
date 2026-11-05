import type { LocalAdSpend, VendoraDB } from '@/lib/db'

export interface AdInput {
  fecha: string
  plataforma: LocalAdSpend['plataforma']
  monto: number
  ventas_atribuidas: number | null
  channel_id: string | null
  product_id: string | null
  notas: string | null
}

// Solo columnas escribibles: user_id y updated_at los pone el servidor
function anuncioPayload(a: LocalAdSpend) {
  return {
    id: a.id,
    fecha: a.fecha,
    plataforma: a.plataforma,
    monto: a.monto,
    ventas_atribuidas: a.ventas_atribuidas,
    channel_id: a.channel_id,
    product_id: a.product_id,
    notas: a.notas,
    deleted_at: a.deleted_at,
    created_at: a.created_at,
  }
}

export async function saveAd(db: VendoraDB, input: AdInput, id?: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.ad_spends, db.outbox, async () => {
    const existente = id ? await db.ad_spends.get(id) : undefined
    const fila: LocalAdSpend = existente
      ? { ...existente, ...input, updated_at: ahora }
      : { id: crypto.randomUUID(), ...input, deleted_at: null, created_at: ahora, updated_at: ahora }
    await db.ad_spends.put(fila)
    await db.outbox.add({ table: 'ad_spends', rowId: fila.id, payload: anuncioPayload(fila), createdAt: ahora })
  })
}

export async function deleteAd(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.ad_spends, db.outbox, async () => {
    const existente = await db.ad_spends.get(id)
    if (!existente) return
    const fila: LocalAdSpend = { ...existente, deleted_at: ahora, updated_at: ahora }
    await db.ad_spends.put(fila)
    await db.outbox.add({ table: 'ad_spends', rowId: id, payload: anuncioPayload(fila), createdAt: ahora })
  })
}
import type { LocalListing, LocalListingTax, VendoraDB } from '@/lib/db'

export interface ListingInput {
  product_id: string
  channel_id: string
  id_externo: string | null
  precio_venta: number
  comision_pct: number
  cargo_fijo: number
  costo_envio: number
  dias_liberacion: number
}

export interface ListingTaxInput {
  tax_type_id: string
  tasa_pct: number
}

// Solo columnas escribibles: user_id y updated_at los pone el servidor
export function listingPayload(l: LocalListing) {
  return {
    id: l.id,
    product_id: l.product_id,
    channel_id: l.channel_id,
    id_externo: l.id_externo,
    precio_venta: l.precio_venta,
    comision_pct: l.comision_pct,
    cargo_fijo: l.cargo_fijo,
    costo_envio: l.costo_envio,
    dias_liberacion: l.dias_liberacion,
    activo: l.activo,
    deleted_at: l.deleted_at,
    created_at: l.created_at,
  }
}

function impuestoPayload(t: LocalListingTax) {
  return {
    id: t.id,
    listing_id: t.listing_id,
    tax_type_id: t.tax_type_id,
    tasa_pct: t.tasa_pct,
    deleted_at: t.deleted_at,
    created_at: t.created_at,
  }
}

// Debe llamarse dentro de una transacción que incluya listing_taxes y outbox
export async function borrarImpuestosDeListing(db: VendoraDB, listingId: string, ahora: string): Promise<void> {
  const activos = await db.listing_taxes
    .where('listing_id')
    .equals(listingId)
    .filter((t) => t.deleted_at === null)
    .toArray()
  for (const t of activos) {
    const fila: LocalListingTax = { ...t, deleted_at: ahora, updated_at: ahora }
    await db.listing_taxes.put(fila)
    await db.outbox.add({ table: 'listing_taxes', rowId: t.id, payload: impuestoPayload(fila), createdAt: ahora })
  }
}

export async function saveListing(
  db: VendoraDB,
  input: ListingInput,
  impuestos: ListingTaxInput[],
  id?: string,
): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.listings, db.listing_taxes, db.outbox, async () => {
    const repetida = await db.listings
      .where('product_id')
      .equals(input.product_id)
      .filter((l) => l.deleted_at === null && l.channel_id === input.channel_id && l.id !== id)
      .first()
    if (repetida) throw new Error('LISTING_DUPLICADO')

    const existente = id ? await db.listings.get(id) : undefined
    const fila: LocalListing = existente
      ? { ...existente, ...input, updated_at: ahora }
      : {
          id: crypto.randomUUID(),
          ...input,
          activo: true,
          deleted_at: null,
          created_at: ahora,
          updated_at: ahora,
        }

    await db.listings.put(fila)
    await db.outbox.add({ table: 'listings', rowId: fila.id, payload: listingPayload(fila), createdAt: ahora })

    // Impuestos: crear o actualizar los elegidos, quitar los que ya no aplican
    const previos = await db.listing_taxes.where('listing_id').equals(fila.id).toArray()
    const porTipo = new Map(previos.map((t) => [t.tax_type_id, t]))
    const elegidos = new Set(impuestos.map((i) => i.tax_type_id))

    for (const imp of impuestos) {
      const previo = porTipo.get(imp.tax_type_id)
      if (previo && previo.deleted_at === null && previo.tasa_pct === imp.tasa_pct) continue

      const nueva: LocalListingTax = previo
        ? { ...previo, tasa_pct: imp.tasa_pct, deleted_at: null, updated_at: ahora }
        : {
            id: crypto.randomUUID(),
            listing_id: fila.id,
            tax_type_id: imp.tax_type_id,
            tasa_pct: imp.tasa_pct,
            deleted_at: null,
            created_at: ahora,
            updated_at: ahora,
          }
      await db.listing_taxes.put(nueva)
      await db.outbox.add({ table: 'listing_taxes', rowId: nueva.id, payload: impuestoPayload(nueva), createdAt: ahora })
    }

    for (const previo of previos) {
      if (previo.deleted_at === null && !elegidos.has(previo.tax_type_id)) {
        const borrada: LocalListingTax = { ...previo, deleted_at: ahora, updated_at: ahora }
        await db.listing_taxes.put(borrada)
        await db.outbox.add({ table: 'listing_taxes', rowId: previo.id, payload: impuestoPayload(borrada), createdAt: ahora })
      }
    }
  })
}

export async function deleteListing(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.listings, db.listing_taxes, db.outbox, async () => {
    const existente = await db.listings.get(id)
    if (!existente) return
    await borrarImpuestosDeListing(db, id, ahora)
    const fila: LocalListing = { ...existente, deleted_at: ahora, updated_at: ahora }
    await db.listings.put(fila)
    await db.outbox.add({ table: 'listings', rowId: id, payload: listingPayload(fila), createdAt: ahora })
  })
}
import type { LocalTaxType, VendoraDB } from '@/lib/db'

export interface TaxTypeInput {
  nombre: string
  clave: LocalTaxType['clave']
  tasa_pct: number | null
}

// Solo columnas escribibles: user_id y updated_at los pone el servidor
function tipoPayload(t: LocalTaxType) {
  return {
    id: t.id,
    nombre: t.nombre,
    clave: t.clave,
    tasa_pct: t.tasa_pct,
    activo: t.activo,
    deleted_at: t.deleted_at,
    created_at: t.created_at,
  }
}

export async function saveTaxType(db: VendoraDB, input: TaxTypeInput, id?: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.tax_types, db.outbox, async () => {
    const nombre = input.nombre.toLowerCase()
    const repetido = await db.tax_types
      .filter((t) => t.deleted_at === null && t.id !== id && t.nombre.toLowerCase() === nombre)
      .first()
    if (repetido) throw new Error('NOMBRE_DUPLICADO')

    const existente = id ? await db.tax_types.get(id) : undefined
    const fila: LocalTaxType = existente
      ? { ...existente, ...input, updated_at: ahora }
      : { id: crypto.randomUUID(), ...input, activo: true, deleted_at: null, created_at: ahora, updated_at: ahora }

    await db.tax_types.put(fila)
    await db.outbox.add({ table: 'tax_types', rowId: fila.id, payload: tipoPayload(fila), createdAt: ahora })
  })
}

export async function setTaxTypeActive(db: VendoraDB, id: string, activo: boolean): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.tax_types, db.outbox, async () => {
    const existente = await db.tax_types.get(id)
    if (!existente) return
    const fila: LocalTaxType = { ...existente, activo, updated_at: ahora }
    await db.tax_types.put(fila)
    await db.outbox.add({ table: 'tax_types', rowId: id, payload: tipoPayload(fila), createdAt: ahora })
  })
}

// Un impuesto asignado a productos no se elimina: se archiva
export async function deleteTaxType(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.tax_types, db.listing_taxes, db.outbox, async () => {
    const enUso = await db.listing_taxes
      .where('tax_type_id')
      .equals(id)
      .filter((t) => t.deleted_at === null)
      .first()
    if (enUso) throw new Error('TIPO_EN_USO')

    const existente = await db.tax_types.get(id)
    if (!existente) return
    const fila: LocalTaxType = { ...existente, deleted_at: ahora, updated_at: ahora }
    await db.tax_types.put(fila)
    await db.outbox.add({ table: 'tax_types', rowId: id, payload: tipoPayload(fila), createdAt: ahora })
  })
}

export async function saveIvaGeneral(db: VendoraDB, pct: number): Promise<void> {
  const ahora = new Date().toISOString()
  await db.transaction('rw', db.profiles, db.outbox, async () => {
    const perfil = await db.profiles.toCollection().first()
    if (!perfil) throw new Error('PERFIL_NO_DESCARGADO')
    await db.profiles.put({ ...perfil, iva_general_pct: pct, updated_at: ahora })
    await db.outbox.add({
      table: 'profiles',
      rowId: perfil.id,
      payload: { id: perfil.id, iva_general_pct: pct },
      createdAt: ahora,
    })
  })
}
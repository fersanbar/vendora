import { supabase } from '@/lib/supabase'
import type { VendoraDB } from './db'

const PAGINA = 1000
type SyncTable =
  | 'products'
  | 'listings'
  | 'tax_types'
  | 'listing_taxes'
  | 'profiles'
  | 'suppliers'
  | 'purchases'
  | 'purchase_items'
  | 'sales'
  | 'expense_categories'
  | 'expenses'
  | 'ad_spends'// Sin código de error = fallo de red. Esos se reintentan, los demás son rechazos del servidor.
function esReintentable(err: { code?: string }): boolean {
  if (!navigator.onLine) return true
  const codigo = err.code ?? ''
  return codigo === '' || codigo === 'PGRST301' || /^(08|53|57)/.test(codigo)
}

export async function pushOutbox(db: VendoraDB): Promise<void> {
  const items = await db.outbox.orderBy('seq').toArray()
  for (const item of items) {
    if (item.error || item.seq === undefined) continue
    const { error } = await supabase.from(item.table).upsert(item.payload, { onConflict: 'id' })
    if (error) {
      if (esReintentable(error)) throw error
      await db.outbox.update(item.seq, { error: error.message })
      continue
    }
    await db.outbox.delete(item.seq)
  }
}

async function pullChannels(db: VendoraDB): Promise<void> {
  const { data, error } = await supabase.from('channels').select('id, nombre, tipo, activo')
  if (error) throw error
  await db.transaction('rw', db.channels, async () => {
    await db.channels.clear()
    await db.channels.bulkPut(data ?? [])
  })
}

async function pullTable(db: VendoraDB, table: SyncTable): Promise<void> {
  const claveCursor = `cursor:${table}`
  const desde = (await db.meta.get(claveCursor))?.value ?? '1970-01-01T00:00:00+00:00'
  // No pisar cambios locales que todavía no se han subido
  const pendientes = new Set(
    (await db.outbox.toArray()).filter((i) => i.table === table).map((i) => i.rowId),
  )

  let maximo = desde
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .gte('updated_at', desde)
      .order('updated_at')
      .order('id')
      .range(inicio, inicio + PAGINA - 1)
    if (error) throw error

    const filas = data ?? []
    const aplicar = filas.filter((f) => !pendientes.has(f.id as string))
    if (aplicar.length > 0) await db.table(table).bulkPut(aplicar)
    for (const f of filas) {
      if ((f.updated_at as string) > maximo) maximo = f.updated_at as string
    }
    if (filas.length < PAGINA) break
  }
  await db.meta.put({ key: claveCursor, value: maximo })
}

export async function syncAll(db: VendoraDB): Promise<void> {
  await pushOutbox(db)
  await pullChannels(db)
  await pullTable(db, 'profiles')
  await pullTable(db, 'products')
  await pullTable(db, 'listings')
  await pullTable(db, 'tax_types')
  await pullTable(db, 'listing_taxes')
  await pullTable(db, 'suppliers')
  await pullTable(db, 'purchases')
  await pullTable(db, 'purchase_items')
  await pullTable(db, 'sales')
  await pullTable(db, 'expense_categories')
  await pullTable(db, 'expenses')
  await pullTable(db, 'ad_spends')
}
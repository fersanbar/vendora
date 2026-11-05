
import type { LocalProduct, VendoraDB } from '@/lib/db'
import { borrarImpuestosDeListing, listingPayload } from '@/features/listings/listings.repo'

export interface ProductInput {
  nombre: string
  sku: string | null
  codigo_barras: string | null
  categoria: string | null
  notas: string | null
}

function aPayload(p: LocalProduct) {
  return {
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    codigo_barras: p.codigo_barras,
    categoria: p.categoria,
    notas: p.notas,
    activo: p.activo,
    deleted_at: p.deleted_at,
    created_at: p.created_at,
  }
}

// Convierte categoría y nombre en segmentos de 3 caracteres
function abreviar(valor: string | null): string {
  if (!valor) return 'GEN'

  const limpio = valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

  return limpio.slice(0, 3) || 'GEN'
}

// Genera el siguiente SKU disponible.
// Incluye productos eliminados para nunca reutilizar consecutivos.
async function generarSku(
  db: VendoraDB,
  nombre: string,
  categoria: string | null,
): Promise<string> {
  const prefijo = `${abreviar(categoria)}-${abreviar(nombre)}`
  const patron = new RegExp(`^${prefijo}-(\\d+)$`)

  const productos = await db.products.toArray()

  let mayor = 0

  for (const producto of productos) {
    if (!producto.sku) continue

    const coincidencia = producto.sku.toUpperCase().match(patron)
    if (!coincidencia) continue

    mayor = Math.max(mayor, Number(coincidencia[1]))
  }

  return `${prefijo}-${String(mayor + 1).padStart(3, '0')}`
}

export async function saveProduct(
  db: VendoraDB,
  input: ProductInput,
  id?: string,
): Promise<void> {
  const ahora = new Date().toISOString()

  await db.transaction('rw', db.products, db.outbox, async () => {
    const existente = id ? await db.products.get(id) : undefined

    // Si el usuario no captura SKU, se genera automáticamente.
    const skuCapturado = input.sku?.trim().toUpperCase() || null

    const skuFinal =
      skuCapturado ??
      await generarSku(db, input.nombre, input.categoria)

    // No permitir duplicados, incluso en productos eliminados.
    const repetido = await db.products
      .filter(
        (p) =>
          p.id !== id &&
          p.sku?.toUpperCase() === skuFinal,
      )
      .first()

    if (repetido) throw new Error('SKU_DUPLICADO')

    const fila: LocalProduct = existente
      ? {
          ...existente,
          ...input,
          sku: skuFinal,
          updated_at: ahora,
        }
      : {
          id: crypto.randomUUID(),
          ...input,
          sku: skuFinal,
          activo: true,
          deleted_at: null,
          created_at: ahora,
          updated_at: ahora,
        }

    await db.products.put(fila)

    await db.outbox.add({
      table: 'products',
      rowId: fila.id,
      payload: aPayload(fila),
      createdAt: ahora,
    })
  })
}

export async function deleteProduct(
  db: VendoraDB,
  id: string,
): Promise<void> {
  const ahora = new Date().toISOString()

  await db.transaction(
    'rw',
    db.products,
    db.listings,
    db.listing_taxes,
    db.outbox,
    async () => {
      const existente = await db.products.get(id)
      if (!existente) return

      const publicaciones = await db.listings
        .where('product_id')
        .equals(id)
        .filter((l) => l.deleted_at === null)
        .toArray()

      for (const l of publicaciones) {
        await borrarImpuestosDeListing(db, l.id, ahora)

        const borrada = {
          ...l,
          deleted_at: ahora,
          updated_at: ahora,
        }

        await db.listings.put(borrada)

        await db.outbox.add({
          table: 'listings',
          rowId: l.id,
          payload: listingPayload(borrada),
          createdAt: ahora,
        })
      }

      const fila: LocalProduct = {
        ...existente,
        deleted_at: ahora,
        updated_at: ahora,
      }

      await db.products.put(fila)

      await db.outbox.add({
        table: 'products',
        rowId: id,
        payload: aPayload(fila),
        createdAt: ahora,
      })
    },
  )
}

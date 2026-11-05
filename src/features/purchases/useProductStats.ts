import { useLiveQuery } from 'dexie-react-hooks'
import { calcularInventario, type Evento } from '@/lib/inventario'
import { useSync } from '@/features/sync/useSync'

export interface ProductoStats {
  stock: number
  costoPromedio: number | null
  ultimoCosto: number | null
}

export function useProductStats(): Map<string, ProductoStats> | undefined {
  const { db } = useSync()
  return useLiveQuery(async () => {
    const compras = new Map(
      (await db.purchases.toArray()).filter((c) => c.deleted_at === null).map((c) => [c.id, c]),
    )
    const items = (await db.purchase_items.toArray()).filter((i) => i.deleted_at === null)
    const ventas = (await db.sales.toArray()).filter((v) => v.deleted_at === null)

    const porProducto = new Map<string, Evento[]>()
    const agregar = (productId: string, evento: Evento) => {
      const lista = porProducto.get(productId) ?? []
      lista.push(evento)
      porProducto.set(productId, lista)
    }

    for (const i of items) {
      const compra = compras.get(i.purchase_id)
      if (!compra) continue
      agregar(i.product_id, {
        tipo: 'compra',
        fecha: compra.fecha,
        creado: compra.created_at,
        cantidad: i.cantidad,
        costo_unitario: i.costo_unitario,
      })
    }
    for (const v of ventas) {
      agregar(v.product_id, { tipo: 'venta', fecha: v.fecha, creado: v.created_at, cantidad: v.cantidad })
    }

    const resultado = new Map<string, ProductoStats>()
    for (const [productId, eventos] of porProducto) {
      resultado.set(productId, calcularInventario(eventos))
    }
    return resultado
  }, [db])
}
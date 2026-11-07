import { useLiveQuery } from 'dexie-react-hooks'
import type {
  LocalAdSpend,
  LocalChannel,
  LocalExpense,
  LocalProduct,
  LocalPurchase,
  LocalPurchaseItem,
  LocalSale,
  LocalSaleItem,
} from '@/lib/db'
import { agruparLineas } from '@/features/sales/pedidos'
import { useSync } from '@/features/sync/useSync'

export interface DatosFinancieros {
  ventas: LocalSale[]
  lineas: Map<string, LocalSaleItem[]>
  compras: LocalPurchase[]
  comprasItems: LocalPurchaseItem[]
  gastos: LocalExpense[]
  anuncios: LocalAdSpend[]
  productos: LocalProduct[]
  canales: LocalChannel[]
}

export function useDatosFinancieros(): DatosFinancieros | undefined {
  const { db } = useSync()
  return useLiveQuery(async (): Promise<DatosFinancieros> => {
    const ventas = (await db.sales.toArray()).filter((v) => v.deleted_at === null)
    const lineas = agruparLineas(await db.sale_items.toArray())
    const compras = (await db.purchases.toArray()).filter((c) => c.deleted_at === null)
    const comprasItems = (await db.purchase_items.toArray()).filter((i) => i.deleted_at === null)
    const gastos = (await db.expenses.toArray()).filter((g) => g.deleted_at === null)
    const anuncios = (await db.ad_spends.toArray()).filter((a) => a.deleted_at === null)
    const productos = await db.products.toArray()
    const canales = await db.channels.toArray()
    return { ventas, lineas, compras, comprasItems, gastos, anuncios, productos, canales }
  }, [db])
}
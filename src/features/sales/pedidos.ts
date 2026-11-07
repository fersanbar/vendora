import type { LocalSaleItem } from '@/lib/db'

export function agruparLineas(items: LocalSaleItem[]): Map<string, LocalSaleItem[]> {
  const mapa = new Map<string, LocalSaleItem[]>()
  for (const i of items) {
    if (i.deleted_at !== null) continue
    const lista = mapa.get(i.sale_id) ?? []
    lista.push(i)
    mapa.set(i.sale_id, lista)
  }
  return mapa
}
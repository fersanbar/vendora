import type { LocalPurchase } from '@/lib/db'

export const METODOS_PAGO: { valor: LocalPurchase['metodo_pago']; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'debito', etiqueta: 'Débito' },
  { valor: 'credito', etiqueta: 'Crédito' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'otro', etiqueta: 'Otro' },
]

export function etiquetaMetodo(m: LocalPurchase['metodo_pago']): string {
  return METODOS_PAGO.find((x) => x.valor === m)?.etiqueta ?? m
}
import type { LocalAdSpend } from '@/lib/db'

export const PLATAFORMAS: { valor: LocalAdSpend['plataforma']; etiqueta: string }[] = [
  { valor: 'meta', etiqueta: 'Meta Ads' },
  { valor: 'mercado_ads', etiqueta: 'Mercado Ads' },
  { valor: 'amazon_ads', etiqueta: 'Amazon Ads' },
  { valor: 'tiktok', etiqueta: 'TikTok Ads' },
  { valor: 'google', etiqueta: 'Google Ads' },
  { valor: 'otro', etiqueta: 'Otra' },
]

export function etiquetaPlataforma(p: LocalAdSpend['plataforma']): string {
  return PLATAFORMAS.find((x) => x.valor === p)?.etiqueta ?? p
}
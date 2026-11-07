import type { LocalListing, LocalListingTax, LocalTaxType } from '@/lib/db'
import { calcularNetoConImpuestos, totalLinea } from '@/lib/money'

export interface SugerenciaLinea {
  comision: number
  cargo_fijo: number
  impuestos: number
  envio: number
  dias: number
}

// Publicación del producto en el canal, con sus impuestos y si lleva IVA marcado
export function contextoPublicacion(
  productoId: string,
  canalId: string,
  listings: LocalListing[],
  listingTaxes: LocalListingTax[],
  tipos: LocalTaxType[],
) {
  const listing = listings.find((l) => l.product_id === productoId && l.channel_id === canalId) ?? null
  const impuestos = listing ? listingTaxes.filter((t) => t.listing_id === listing.id) : []
  const claveTipo = new Map(tipos.map((t) => [t.id, t.clave]))
  const aplicaIva = impuestos.some((t) => claveTipo.get(t.tax_type_id) === 'iva')
  return { listing, impuestos, aplicaIva }
}

// Comisión, cargo fijo e impuestos son de la línea; el envío es del pedido, así que
// aquí solo se devuelve como referencia (no se multiplica por piezas).
export function sugerirLinea(params: {
  listing: LocalListing | null
  impuestos: LocalListingTax[]
  aplicaIva: boolean
  ivaGeneral: number
  cantidad: number
  precioUnitario: number
}): SugerenciaLinea {
  const { listing, impuestos, aplicaIva, ivaGeneral, cantidad, precioUnitario } = params
  if (!listing) return { comision: 0, cargo_fijo: 0, impuestos: 0, envio: 0, dias: 0 }

  const precioTotal = totalLinea(cantidad, precioUnitario)
  const fijo = totalLinea(cantidad, listing.cargo_fijo)
  const calculo = calcularNetoConImpuestos(
    precioTotal,
    listing.comision_pct,
    fijo,
    0,
    ivaGeneral,
    aplicaIva,
    impuestos.map((i) => i.tasa_pct),
  )
  return {
    comision: calculo.comision,
    cargo_fijo: fijo,
    impuestos: calculo.totalImpuestos,
    envio: listing.costo_envio,
    dias: listing.dias_liberacion,
  }
}
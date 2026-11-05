import type { LocalListing, LocalListingTax } from '@/lib/db'
import { calcularNetoConImpuestos, totalLinea } from '@/lib/money'

export interface Sugerencia {
  comision: number
  cargo_fijo: number
  costo_envio: number
  impuestos: number
}

// Cargo fijo y envío se toman por pieza; todo se puede corregir en la venta
export function sugerirDesdePublicacion(params: {
  listing: LocalListing
  impuestos: LocalListingTax[]
  aplicaIva: boolean
  ivaGeneral: number
  cantidad: number
  precioUnitario: number
}): Sugerencia {
  const { listing, impuestos, aplicaIva, ivaGeneral, cantidad, precioUnitario } = params
  const precioTotal = totalLinea(cantidad, precioUnitario)
  const fijo = totalLinea(cantidad, listing.cargo_fijo)
  const envio = totalLinea(cantidad, listing.costo_envio)
  const calculo = calcularNetoConImpuestos(
    precioTotal,
    listing.comision_pct,
    fijo,
    envio,
    ivaGeneral,
    aplicaIva,
    impuestos.map((i) => i.tasa_pct),
  )
  return {
    comision: calculo.comision,
    cargo_fijo: fijo,
    costo_envio: envio,
    impuestos: calculo.totalImpuestos,
  }
}
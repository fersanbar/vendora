import Decimal from 'decimal.js'

const D = Decimal.clone({ rounding: Decimal.ROUND_HALF_UP })

// Vacío = 0. Texto inválido = null.
export function parseMonto(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (t === '') return 0
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(t)) return null
  return Number(t)
}

export function parsePorcentaje(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (t === '') return 0
  if (!/^\d{1,3}(\.\d{1,3})?$/.test(t)) return null
  const n = Number(t)
  return n <= 100 ? n : null
}

export function parseDias(texto: string): number | null {
  const t = texto.trim()
  if (t === '') return 0
  if (!/^\d{1,3}$/.test(t)) return null
  const n = Number(t)
  return n <= 365 ? n : null
}

export function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

export function calcularNeto(
  precio: number,
  comisionPct: number,
  cargoFijo: number,
  costoEnvio: number,
): { comision: number; neto: number } {
  const p = new D(precio)
  const comision = p.times(comisionPct).dividedBy(100).toDecimalPlaces(2)
  const neto = p.minus(comision).minus(cargoFijo).minus(costoEnvio)
  return { comision: comision.toNumber(), neto: neto.toNumber() }
}

export function calcularMargen(
  precio: number,
  neto: number,
  costo: number,
): { utilidad: number; margenPct: number | null; roiPct: number | null } {
  const utilidad = new D(neto).minus(costo)
  return {
    utilidad: utilidad.toNumber(),
    margenPct: precio > 0 ? utilidad.dividedBy(precio).times(100).toDecimalPlaces(1).toNumber() : null,
    roiPct: costo > 0 ? utilidad.dividedBy(costo).times(100).toDecimalPlaces(1).toNumber() : null,
  }
}

export function sumar(valores: number[]): number {
  return valores.reduce((acc, v) => acc.plus(v), new D(0)).toNumber()
}

// Base de los impuestos: precio ÷ (1 + IVA general), redondeada a 2 decimales
export function calcularBase(precio: number, ivaGeneralPct: number): number {
  return new D(precio)
    .dividedBy(new D(ivaGeneralPct).dividedBy(100).plus(1))
    .toDecimalPlaces(2)
    .toNumber()
}

export function calcularImpuesto(base: number, tasaPct: number): number {
  return new D(base).times(tasaPct).dividedBy(100).toDecimalPlaces(2).toNumber()
}

export function calcularNetoConImpuestos(
  precio: number,
  comisionPct: number,
  cargoFijo: number,
  costoEnvio: number,
  ivaGeneralPct: number,
  aplicaIva: boolean,
  tasas: number[],
): {
  comision: number
  baseImpuestos: number
  impuestos: number[]
  totalImpuestos: number
  neto: number
} {
  const parcial = calcularNeto(precio, comisionPct, cargoFijo, costoEnvio)
  // Con IVA marcado la base es el precio sin IVA general; sin IVA, el precio completo
  const baseImpuestos = aplicaIva ? calcularBase(precio, ivaGeneralPct) : precio
  const montos = tasas.map((t) => calcularImpuesto(baseImpuestos, t))
  const total = sumar(montos)
  return {
    comision: parcial.comision,
    baseImpuestos,
    impuestos: montos,
    totalImpuestos: total,
    neto: new D(parcial.neto).minus(total).toNumber(),
  }
}

export function parseCantidad(texto: string): number | null {
  const t = texto.trim()
  if (!/^\d{1,6}$/.test(t)) return null
  const n = Number(t)
  return n > 0 && n <= 100000 ? n : null
}

// Costo unitario: hasta 4 decimales (un paquete de 6 a $289 sale a 48.1667 c/u)
export function parseCosto(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (!/^\d{1,8}(\.\d{1,4})?$/.test(t)) return null
  return Number(t)
}

export function totalLinea(cantidad: number, costoUnitario: number): number {
  return new D(cantidad).times(costoUnitario).toDecimalPlaces(2).toNumber()
}

export function costoPromedioPonderado(
  lineas: { cantidad: number; costo_unitario: number }[],
): number | null {
  const cantidad = lineas.reduce((acc, l) => acc.plus(l.cantidad), new D(0))
  if (cantidad.lte(0)) return null
  const total = lineas.reduce((acc, l) => acc.plus(new D(l.cantidad).times(l.costo_unitario)), new D(0))
  return total.dividedBy(cantidad).toDecimalPlaces(4).toNumber()
}

export interface LineaPedido {
  cantidad: number
  precio_unitario: number
  comision: number
  cargo_fijo: number
  costo_unitario: number | null
}

export interface DatosPedido {
  lineas: LineaPedido[]
  costo_envio: number
  impuestos: number
}

// Pedido: el envío y los impuestos son del pedido completo, no de cada pieza.
// La utilidad solo se calcula si todas las líneas tienen costo.
export function calcularPedido(p: DatosPedido): {
  piezas: number
  ingreso: number
  cargos: number
  neto: number
  costo: number | null
  utilidad: number | null
  margenPct: number | null
  roiPct: number | null
  lineasSinCosto: number
} {
  const ingreso = p.lineas.reduce(
    (acc, l) => acc.plus(new D(l.precio_unitario).times(l.cantidad).toDecimalPlaces(2)),
    new D(0),
  )
  const cargos = p.lineas.reduce((acc, l) => acc.plus(l.comision).plus(l.cargo_fijo), new D(0))
  const neto = ingreso.minus(cargos).minus(p.costo_envio).minus(p.impuestos)

  const lineasSinCosto = p.lineas.filter((l) => l.costo_unitario === null).length
  const costo =
    p.lineas.length > 0 && lineasSinCosto === 0
      ? p.lineas.reduce(
          (acc, l) => acc.plus(new D(l.costo_unitario ?? 0).times(l.cantidad).toDecimalPlaces(2)),
          new D(0),
        )
      : null
  const utilidad = costo === null ? null : neto.minus(costo)

  return {
    piezas: p.lineas.reduce((acc, l) => acc + l.cantidad, 0),
    ingreso: ingreso.toNumber(),
    cargos: cargos.toNumber(),
    neto: neto.toNumber(),
    costo: costo === null ? null : costo.toNumber(),
    utilidad: utilidad === null ? null : utilidad.toNumber(),
    margenPct:
      utilidad !== null && ingreso.gt(0)
        ? utilidad.dividedBy(ingreso).times(100).toDecimalPlaces(1).toNumber()
        : null,
    roiPct:
      utilidad !== null && costo !== null && costo.gt(0)
        ? utilidad.dividedBy(costo).times(100).toDecimalPlaces(1).toNumber()
        : null,
    lineasSinCosto,
  }
}

// Existencias contadas: acepta 0
export function parseExistencias(texto: string): number | null {
  const t = texto.trim()
  if (!/^\d{1,6}$/.test(t)) return null
  const n = Number(t)
  return n <= 100000 ? n : null
}
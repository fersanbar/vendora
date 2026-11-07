import Decimal from 'decimal.js'
import { totalLinea } from './money'

const D = Decimal.clone({ rounding: Decimal.ROUND_HALF_UP })

// Reparte un total en proporción a los pesos, a 2 decimales. La última parte absorbe el
// redondeo, así la suma siempre es exactamente el total.
export function repartirProporcional(total: number, pesos: number[]): number[] {
  const n = pesos.length
  if (n === 0) return []
  const suma = pesos.reduce((acc, p) => acc.plus(p), new D(0))
  const partes: Decimal[] = []
  let asignado = new D(0)
  for (let i = 0; i < n - 1; i++) {
    const base = suma.gt(0) ? new D(total).times(pesos[i]).dividedBy(suma) : new D(total).dividedBy(n)
    const parte = base.toDecimalPlaces(2)
    partes.push(parte)
    asignado = asignado.plus(parte)
  }
  partes.push(new D(total).minus(asignado))
  return partes.map((p) => p.toNumber())
}

export interface LineaRentabilidad {
  product_id: string
  cantidad: number
  precio_unitario: number
  comision: number
  cargo_fijo: number
  costo_unitario: number | null
}

export interface ResultadoLinea {
  product_id: string
  piezas: number
  ingreso: number
  cargos: number
  envio: number
  impuestos: number
  neto: number
  costo: number | null
  utilidad: number | null
}

// Utilidad de cada línea: el envío y los impuestos del pedido se reparten por ingreso
export function calcularLineasPedido(p: {
  lineas: LineaRentabilidad[]
  costo_envio: number
  impuestos: number
}): ResultadoLinea[] {
  const ingresos = p.lineas.map((l) => totalLinea(l.cantidad, l.precio_unitario))
  const envios = repartirProporcional(p.costo_envio, ingresos)
  const impuestos = repartirProporcional(p.impuestos, ingresos)

  return p.lineas.map((l, i) => {
    const cargos = new D(l.comision).plus(l.cargo_fijo)
    const neto = new D(ingresos[i]).minus(cargos).minus(envios[i]).minus(impuestos[i])
    const costo = l.costo_unitario === null ? null : new D(l.costo_unitario).times(l.cantidad).toDecimalPlaces(2)
    return {
      product_id: l.product_id,
      piezas: l.cantidad,
      ingreso: ingresos[i],
      cargos: cargos.toNumber(),
      envio: envios[i],
      impuestos: impuestos[i],
      neto: neto.toNumber(),
      costo: costo === null ? null : costo.toNumber(),
      utilidad: costo === null ? null : neto.minus(costo).toNumber(),
    }
  })
}

export interface ResumenProducto {
  product_id: string
  piezas: number
  ingreso: number
  neto: number
  utilidad: number | null
  margenPct: number | null
  roiPct: number | null
  lineasSinCosto: number
}

// Solo las líneas con costo entran a la utilidad, el margen y el ROI
export function agregarPorProducto(lineas: ResultadoLinea[]): ResumenProducto[] {
  const mapa = new Map<
    string,
    {
      piezas: number
      ingreso: Decimal
      neto: Decimal
      utilidad: Decimal
      costo: Decimal
      ingresoConCosto: Decimal
      conCosto: number
      sinCosto: number
    }
  >()

  for (const l of lineas) {
    const acc = mapa.get(l.product_id) ?? {
      piezas: 0,
      ingreso: new D(0),
      neto: new D(0),
      utilidad: new D(0),
      costo: new D(0),
      ingresoConCosto: new D(0),
      conCosto: 0,
      sinCosto: 0,
    }
    acc.piezas += l.piezas
    acc.ingreso = acc.ingreso.plus(l.ingreso)
    acc.neto = acc.neto.plus(l.neto)
    if (l.utilidad !== null && l.costo !== null) {
      acc.utilidad = acc.utilidad.plus(l.utilidad)
      acc.costo = acc.costo.plus(l.costo)
      acc.ingresoConCosto = acc.ingresoConCosto.plus(l.ingreso)
      acc.conCosto += 1
    } else {
      acc.sinCosto += 1
    }
    mapa.set(l.product_id, acc)
  }

  return Array.from(mapa, ([product_id, a]) => ({
    product_id,
    piezas: a.piezas,
    ingreso: a.ingreso.toNumber(),
    neto: a.neto.toNumber(),
    utilidad: a.conCosto > 0 ? a.utilidad.toNumber() : null,
    margenPct:
      a.conCosto > 0 && a.ingresoConCosto.gt(0)
        ? a.utilidad.dividedBy(a.ingresoConCosto).times(100).toDecimalPlaces(1).toNumber()
        : null,
    roiPct:
      a.conCosto > 0 && a.costo.gt(0)
        ? a.utilidad.dividedBy(a.costo).times(100).toDecimalPlaces(1).toNumber()
        : null,
    lineasSinCosto: a.sinCosto,
  }))
}

export interface PedidoCanal {
  channel_id: string
  ingreso: number
  neto: number
  utilidad: number | null
  piezas: number
}

export interface ResumenCanal {
  channel_id: string
  pedidos: number
  piezas: number
  ingreso: number
  neto: number
  utilidad: number | null
  margenPct: number | null
  pedidosSinCosto: number
}

// Por canal se usan pedidos completos: un pedido con costo incompleto no entra a la utilidad
export function agregarPorCanal(pedidos: PedidoCanal[]): ResumenCanal[] {
  const mapa = new Map<
    string,
    {
      pedidos: number
      piezas: number
      ingreso: Decimal
      neto: Decimal
      utilidad: Decimal
      ingresoConCosto: Decimal
      conCosto: number
    }
  >()

  for (const p of pedidos) {
    const acc = mapa.get(p.channel_id) ?? {
      pedidos: 0,
      piezas: 0,
      ingreso: new D(0),
      neto: new D(0),
      utilidad: new D(0),
      ingresoConCosto: new D(0),
      conCosto: 0,
    }
    acc.pedidos += 1
    acc.piezas += p.piezas
    acc.ingreso = acc.ingreso.plus(p.ingreso)
    acc.neto = acc.neto.plus(p.neto)
    if (p.utilidad !== null) {
      acc.utilidad = acc.utilidad.plus(p.utilidad)
      acc.ingresoConCosto = acc.ingresoConCosto.plus(p.ingreso)
      acc.conCosto += 1
    }
    mapa.set(p.channel_id, acc)
  }

  return Array.from(mapa, ([channel_id, a]) => ({
    channel_id,
    pedidos: a.pedidos,
    piezas: a.piezas,
    ingreso: a.ingreso.toNumber(),
    neto: a.neto.toNumber(),
    utilidad: a.conCosto > 0 ? a.utilidad.toNumber() : null,
    margenPct:
      a.conCosto > 0 && a.ingresoConCosto.gt(0)
        ? a.utilidad.dividedBy(a.ingresoConCosto).times(100).toDecimalPlaces(1).toNumber()
        : null,
    pedidosSinCosto: a.pedidos - a.conCosto,
  }))
}
import Decimal from 'decimal.js'
import { costoPromedioPonderado } from './money'

const D = Decimal.clone({ rounding: Decimal.ROUND_HALF_UP })

export interface EventoCompra {
  tipo: 'compra'
  fecha: string
  creado: string
  cantidad: number
  costo_unitario: number
}

// Ajuste manual: cantidad con signo. Si suma piezas y trae costo, se mezcla como una compra;
// sin costo entra al costo promedio actual sin moverlo.
export interface EventoAjuste {
  tipo: 'ajuste'
  fecha: string
  creado: string
  cantidad: number
  costo_unitario: number | null
}

export interface EventoVenta {
  tipo: 'venta'
  fecha: string
  creado: string
  cantidad: number
}

export type Evento = EventoCompra | EventoAjuste | EventoVenta

export interface ResultadoInventario {
  stock: number
  costoPromedio: number | null
  ultimoCosto: number | null
}

const RANGO = { compra: 0, ajuste: 1, venta: 2 } as const

// Promedio móvil: el costo cambia solo cuando entran piezas con costo. Las ventas y las
// salidas bajan existencias sin tocarlo. En un mismo día: compras, ajustes y luego ventas.
export function calcularInventario(eventos: Evento[]): ResultadoInventario {
  const ordenados = [...eventos].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
    if (a.tipo !== b.tipo) return RANGO[a.tipo] - RANGO[b.tipo]
    if (a.creado !== b.creado) return a.creado < b.creado ? -1 : 1
    return 0
  })

  let stock = new D(0)
  let promedio: Decimal | null = null

  for (const e of ordenados) {
    if (e.tipo === 'venta') {
      stock = stock.minus(e.cantidad)
      continue
    }
    if (e.cantidad < 0) {
      stock = stock.plus(e.cantidad)
      continue
    }

    const cantidad = new D(e.cantidad)
    if (e.costo_unitario !== null) {
      if (promedio === null || stock.lte(0)) {
        promedio = new D(e.costo_unitario)
      } else {
        promedio = stock
          .times(promedio)
          .plus(cantidad.times(e.costo_unitario))
          .dividedBy(stock.plus(cantidad))
      }
    }
    stock = stock.plus(cantidad)
  }

  const compras = eventos.filter((e): e is EventoCompra => e.tipo === 'compra')
  const claveMax = compras.reduce((max, c) => {
    const clave = `${c.fecha}|${c.creado}`
    return clave > max ? clave : max
  }, '')
  const ultimas = compras.filter((c) => `${c.fecha}|${c.creado}` === claveMax)

  return {
    stock: stock.toNumber(),
    costoPromedio: promedio === null ? null : promedio.toDecimalPlaces(4).toNumber(),
    ultimoCosto: costoPromedioPonderado(ultimas),
  }
}

// Capital en inventario: existencias × costo promedio (solo existencias positivas y con costo)
export function valorInventario(productos: { stock: number; costoPromedio: number | null }[]): number {
  return productos
    .reduce(
      (acc, p) =>
        p.stock > 0 && p.costoPromedio !== null ? acc.plus(new D(p.stock).times(p.costoPromedio)) : acc,
      new D(0),
    )
    .toDecimalPlaces(2)
    .toNumber()
}
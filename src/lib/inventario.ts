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

export interface EventoVenta {
  tipo: 'venta'
  fecha: string
  creado: string
  cantidad: number
}

export type Evento = EventoCompra | EventoVenta

export interface ResultadoInventario {
  stock: number
  costoPromedio: number | null
  ultimoCosto: number | null
}

// Promedio móvil: el costo cambia solo cuando entra una compra. Las ventas bajan
// existencias sin tocar el costo. En un mismo día, las compras van antes que las ventas.
export function calcularInventario(eventos: Evento[]): ResultadoInventario {
  const ordenados = [...eventos].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
    if (a.tipo !== b.tipo) return a.tipo === 'compra' ? -1 : 1
    if (a.creado !== b.creado) return a.creado < b.creado ? -1 : 1
    return 0
  })

  let stock = new D(0)
  let promedio: Decimal | null = null

  for (const e of ordenados) {
    if (e.tipo === 'compra') {
      const cantidad = new D(e.cantidad)
      if (promedio === null || stock.lte(0)) {
        promedio = new D(e.costo_unitario)
      } else {
        promedio = stock
          .times(promedio)
          .plus(cantidad.times(e.costo_unitario))
          .dividedBy(stock.plus(cantidad))
      }
      stock = stock.plus(cantidad)
    } else {
      stock = stock.minus(e.cantidad)
    }
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
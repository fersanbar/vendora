import Decimal from 'decimal.js'
import { calcularVenta, sumar, type DatosVenta } from './money'

const D = Decimal.clone({ rounding: Decimal.ROUND_HALF_UP })

export interface ResumenFinanzas {
  ingresos: number
  utilidadVentas: number
  ventasSinCosto: number
  gastos: number
  publicidad: number
  utilidadNeta: number
}

// ROAS = ventas atribuidas ÷ gasto en publicidad
export function calcularRoas(atribuidas: number, gasto: number): number | null {
  if (gasto <= 0) return null
  return new D(atribuidas).dividedBy(gasto).toDecimalPlaces(2).toNumber()
}

// Utilidad neta = utilidad de ventas − gastos − publicidad.
// Las ventas sin costo registrado no entran a la utilidad: se cuentan aparte.
export function calcularResumen(params: {
  ventas: DatosVenta[]
  gastos: number[]
  publicidad: number[]
}): ResumenFinanzas {
  const calculos = params.ventas.map((v) => calcularVenta(v))
  const ingresos = sumar(calculos.map((c) => c.ingreso))
  const utilidadVentas = sumar(calculos.map((c) => c.utilidad ?? 0))
  const ventasSinCosto = calculos.filter((c) => c.utilidad === null).length
  const gastos = sumar(params.gastos)
  const publicidad = sumar(params.publicidad)
  const utilidadNeta = new D(utilidadVentas).minus(gastos).minus(publicidad).toNumber()
  return { ingresos, utilidadVentas, ventasSinCosto, gastos, publicidad, utilidadNeta }
}
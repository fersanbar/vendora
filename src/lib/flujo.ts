import Decimal from 'decimal.js'
import { sumar } from './money'

const D = Decimal.clone({ rounding: Decimal.ROUND_HALF_UP })

export interface EntradaVenta {
  estado: 'pendiente' | 'liberado'
  fechaLiberacion: string | null
  neto: number
}

export interface Movimiento {
  fecha: string
  monto: number
}

export interface ResultadoFlujo {
  entradas: number
  compras: number
  gastos: number
  publicidad: number
  salidas: number
  flujoNeto: number
  acumulado: number
  pendiente: number
}

// Flujo de efectivo: lo que entró (ventas liberadas, por fecha de liberación) menos lo que salió
// (compras, gastos y publicidad, por fecha de pago). No es la utilidad ni el saldo del banco.
export function calcularFlujo(params: {
  periodo: string
  ventas: EntradaVenta[]
  compras: Movimiento[]
  gastos: Movimiento[]
  publicidad: Movimiento[]
}): ResultadoFlujo {
  const { periodo } = params
  const enPeriodo = (m: Movimiento) => m.fecha.startsWith(periodo)
  const hastaPeriodo = (m: Movimiento) => m.fecha.slice(0, 7) <= periodo
  const total = (movs: Movimiento[]) => sumar(movs.map((m) => m.monto))

  const liberadas: Movimiento[] = params.ventas.flatMap((v) =>
    v.estado === 'liberado' && v.fechaLiberacion !== null ? [{ fecha: v.fechaLiberacion, monto: v.neto }] : [],
  )

  const entradas = total(liberadas.filter(enPeriodo))
  const compras = total(params.compras.filter(enPeriodo))
  const gastos = total(params.gastos.filter(enPeriodo))
  const publicidad = total(params.publicidad.filter(enPeriodo))
  const salidas = sumar([compras, gastos, publicidad])

  const salidasAcumuladas = sumar([
    total(params.compras.filter(hastaPeriodo)),
    total(params.gastos.filter(hastaPeriodo)),
    total(params.publicidad.filter(hastaPeriodo)),
  ])

  return {
    entradas,
    compras,
    gastos,
    publicidad,
    salidas,
    flujoNeto: new D(entradas).minus(salidas).toNumber(),
    acumulado: new D(total(liberadas.filter(hastaPeriodo))).minus(salidasAcumuladas).toNumber(),
    pendiente: sumar(params.ventas.filter((v) => v.estado === 'pendiente').map((v) => v.neto)),
  }
}
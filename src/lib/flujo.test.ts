import { describe, expect, it } from 'vitest'
import { calcularFlujo } from './flujo'

describe('calcularFlujo', () => {
  const base = {
    periodo: '2026-11',
    ventas: [
      { estado: 'liberado' as const, fechaLiberacion: '2026-11-05', neto: 500 },
      { estado: 'liberado' as const, fechaLiberacion: '2026-10-20', neto: 300 },
      { estado: 'pendiente' as const, fechaLiberacion: null, neto: 200 },
    ],
    compras: [
      { fecha: '2026-11-02', monto: 400 },
      { fecha: '2026-10-15', monto: 1000 },
    ],
    gastos: [
      { fecha: '2026-11-03', monto: 50 },
      { fecha: '2026-12-01', monto: 999 },
    ],
    publicidad: [{ fecha: '2026-11-04', monto: 100 }],
  }

  it('cuenta lo liberado y lo pagado en el mes, y acumula hasta el mes', () => {
    expect(calcularFlujo(base)).toEqual({
      entradas: 500,
      compras: 400,
      gastos: 50,
      publicidad: 100,
      salidas: 550,
      flujoNeto: -50,
      acumulado: -750,
      pendiente: 200,
    })
  })

  it('una venta liberada sin fecha no entra al flujo', () => {
    const r = calcularFlujo({
      periodo: '2026-11',
      ventas: [{ estado: 'liberado', fechaLiberacion: null, neto: 100 }],
      compras: [],
      gastos: [],
      publicidad: [],
    })
    expect(r.entradas).toBe(0)
    expect(r.acumulado).toBe(0)
  })

  it('sin movimientos todo es cero', () => {
    const r = calcularFlujo({ periodo: '2026-11', ventas: [], compras: [], gastos: [], publicidad: [] })
    expect(r).toEqual({
      entradas: 0,
      compras: 0,
      gastos: 0,
      publicidad: 0,
      salidas: 0,
      flujoNeto: 0,
      acumulado: 0,
      pendiente: 0,
    })
  })
})
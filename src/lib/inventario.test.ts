import { describe, expect, it } from 'vitest'
import { calcularInventario, type Evento } from './inventario'

describe('calcularInventario', () => {
  it('sin eventos', () => {
    expect(calcularInventario([])).toEqual({ stock: 0, costoPromedio: null, ultimoCosto: null })
  })

  it('solo compras: promedio ponderado y último costo', () => {
    const eventos: Evento[] = [
      { tipo: 'compra', fecha: '2026-01-01', creado: 'a', cantidad: 3, costo_unitario: 100 },
      { tipo: 'compra', fecha: '2026-01-02', creado: 'b', cantidad: 2, costo_unitario: 110 },
    ]
    expect(calcularInventario(eventos)).toEqual({ stock: 5, costoPromedio: 104, ultimoCosto: 110 })
  })

  it('promedio móvil: si vendes todo, la siguiente compra fija el costo', () => {
    const eventos: Evento[] = [
      { tipo: 'compra', fecha: '2026-01-01', creado: 'a', cantidad: 3, costo_unitario: 100 },
      { tipo: 'venta', fecha: '2026-01-02', creado: 'b', cantidad: 3 },
      { tipo: 'compra', fecha: '2026-01-03', creado: 'c', cantidad: 5, costo_unitario: 120 },
    ]
    const r = calcularInventario(eventos)
    expect(r.stock).toBe(5)
    expect(r.costoPromedio).toBe(120)
  })

  it('venta parcial: el costo se mezcla solo con lo que queda', () => {
    const eventos: Evento[] = [
      { tipo: 'compra', fecha: '2026-01-01', creado: 'a', cantidad: 10, costo_unitario: 100 },
      { tipo: 'venta', fecha: '2026-01-02', creado: 'b', cantidad: 4 },
      { tipo: 'compra', fecha: '2026-01-03', creado: 'c', cantidad: 6, costo_unitario: 130 },
    ]
    const r = calcularInventario(eventos)
    expect(r.stock).toBe(12)
    expect(r.costoPromedio).toBe(115)
  })

  it('en el mismo día las compras van antes que las ventas', () => {
    const eventos: Evento[] = [
      { tipo: 'venta', fecha: '2026-01-01', creado: 'a', cantidad: 2 },
      { tipo: 'compra', fecha: '2026-01-01', creado: 'b', cantidad: 5, costo_unitario: 50 },
    ]
    const r = calcularInventario(eventos)
    expect(r.stock).toBe(3)
    expect(r.costoPromedio).toBe(50)
  })

  it('sobreventa sin compras deja existencias negativas', () => {
    const eventos: Evento[] = [{ tipo: 'venta', fecha: '2026-01-01', creado: 'a', cantidad: 2 }]
    expect(calcularInventario(eventos)).toEqual({ stock: -2, costoPromedio: null, ultimoCosto: null })
  })

  it('una compra posterior a una sobreventa reinicia el costo', () => {
    const eventos: Evento[] = [
      { tipo: 'venta', fecha: '2026-01-01', creado: 'a', cantidad: 2 },
      { tipo: 'compra', fecha: '2026-01-02', creado: 'b', cantidad: 5, costo_unitario: 50 },
    ]
    const r = calcularInventario(eventos)
    expect(r.stock).toBe(3)
    expect(r.costoPromedio).toBe(50)
  })
})
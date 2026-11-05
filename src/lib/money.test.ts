import { describe, expect, it } from 'vitest'
import {
  calcularBase,
  calcularImpuesto,
  calcularMargen,
  calcularNeto,
  calcularNetoConImpuestos,
  calcularVenta,
  costoPromedioPonderado,
  parseMonto,
  totalLinea,
} from './money'

describe('parseMonto', () => {
  it('vacío es 0', () => expect(parseMonto('')).toBe(0))
  it('acepta coma decimal', () => expect(parseMonto('12,5')).toBe(12.5))
  it('rechaza 3 decimales', () => expect(parseMonto('1.234')).toBeNull())
  it('rechaza texto', () => expect(parseMonto('abc')).toBeNull())
})

describe('calcularNeto', () => {
  it('descuenta comisión, cargo fijo y envío', () => {
    expect(calcularNeto(500, 17, 25, 60)).toEqual({ comision: 85, neto: 330 })
  })
})

describe('impuestos', () => {
  it('la base es el precio entre 1.16', () => {
    expect(calcularBase(349, 16)).toBe(300.86)
  })
  it('ISR 2.5% sobre la base', () => {
    expect(calcularImpuesto(300.86, 2.5)).toBe(7.52)
  })
  it('ISR 2.5% sobre el precio completo redondea hacia arriba', () => {
    expect(calcularImpuesto(349, 2.5)).toBe(8.73)
  })
  it('con IVA marcado: IVA 8% e ISR 2.5% sobre la base', () => {
    const r = calcularNetoConImpuestos(349, 0, 0, 0, 16, true, [8, 2.5])
    expect(r.baseImpuestos).toBe(300.86)
    expect(r.impuestos).toEqual([24.07, 7.52])
    expect(r.neto).toBe(317.41)
  })
  it('sin IVA marcado: ISR sobre el precio completo', () => {
    const r = calcularNetoConImpuestos(349, 0, 0, 0, 16, false, [2.5])
    expect(r.baseImpuestos).toBe(349)
    expect(r.impuestos).toEqual([8.73])
    expect(r.neto).toBe(340.27)
  })
})

describe('costos', () => {
  it('promedio ponderado', () => {
    expect(
      costoPromedioPonderado([
        { cantidad: 3, costo_unitario: 100 },
        { cantidad: 2, costo_unitario: 110 },
      ]),
    ).toBe(104)
  })
  it('sin líneas no hay promedio', () => expect(costoPromedioPonderado([])).toBeNull())
  it('total de línea con 4 decimales de costo', () => expect(totalLinea(6, 48.1667)).toBe(289))
})

describe('calcularMargen', () => {
  it('utilidad, margen y ROI', () => {
    expect(calcularMargen(349, 317.41, 104)).toEqual({ utilidad: 213.41, margenPct: 61.1, roiPct: 205.2 })
  })
})

describe('calcularVenta', () => {
  const base = {
    cantidad: 2,
    precio_unitario: 349,
    comision: 100,
    cargo_fijo: 0,
    costo_envio: 60,
    impuestos: 62,
  }
  it('calcula neto, utilidad, margen y ROI', () => {
    expect(calcularVenta({ ...base, costo_unitario: 104.5 })).toEqual({
      ingreso: 698,
      neto: 476,
      costo: 209,
      utilidad: 267,
      margenPct: 38.3,
      roiPct: 127.8,
    })
  })
  it('sin costo no hay utilidad', () => {
    const r = calcularVenta({ ...base, costo_unitario: null })
    expect(r.neto).toBe(476)
    expect(r.utilidad).toBeNull()
    expect(r.roiPct).toBeNull()
  })
})
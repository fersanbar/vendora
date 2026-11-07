import { describe, expect, it } from "vitest";
import {
  calcularBase,
  calcularImpuesto,
  calcularMargen,
  calcularNeto,
  calcularNetoConImpuestos,
  calcularPedido,
  costoPromedioPonderado,
  parseMonto,
  totalLinea,
} from "./money";

describe("parseMonto", () => {
  it("vacío es 0", () => expect(parseMonto("")).toBe(0));
  it("acepta coma decimal", () => expect(parseMonto("12,5")).toBe(12.5));
  it("rechaza 3 decimales", () => expect(parseMonto("1.234")).toBeNull());
  it("rechaza texto", () => expect(parseMonto("abc")).toBeNull());
});

describe("calcularNeto", () => {
  it("descuenta comisión, cargo fijo y envío", () => {
    expect(calcularNeto(500, 17, 25, 60)).toEqual({ comision: 85, neto: 330 });
  });
});

describe("impuestos", () => {
  it("la base es el precio entre 1.16", () => {
    expect(calcularBase(349, 16)).toBe(300.86);
  });
  it("ISR 2.5% sobre la base", () => {
    expect(calcularImpuesto(300.86, 2.5)).toBe(7.52);
  });
  it("ISR 2.5% sobre el precio completo redondea hacia arriba", () => {
    expect(calcularImpuesto(349, 2.5)).toBe(8.73);
  });
  it("con IVA marcado: IVA 8% e ISR 2.5% sobre la base", () => {
    const r = calcularNetoConImpuestos(349, 0, 0, 0, 16, true, [8, 2.5]);
    expect(r.baseImpuestos).toBe(300.86);
    expect(r.impuestos).toEqual([24.07, 7.52]);
    expect(r.neto).toBe(317.41);
  });
  it("sin IVA marcado: ISR sobre el precio completo", () => {
    const r = calcularNetoConImpuestos(349, 0, 0, 0, 16, false, [2.5]);
    expect(r.baseImpuestos).toBe(349);
    expect(r.impuestos).toEqual([8.73]);
    expect(r.neto).toBe(340.27);
  });
});

describe("costos", () => {
  it("promedio ponderado", () => {
    expect(
      costoPromedioPonderado([
        { cantidad: 3, costo_unitario: 100 },
        { cantidad: 2, costo_unitario: 110 },
      ]),
    ).toBe(104);
  });
  it("sin líneas no hay promedio", () =>
    expect(costoPromedioPonderado([])).toBeNull());
  it("total de línea con 4 decimales de costo", () =>
    expect(totalLinea(6, 48.1667)).toBe(289));
});

describe("calcularMargen", () => {
  it("utilidad, margen y ROI", () => {
    expect(calcularMargen(349, 317.41, 104)).toEqual({
      utilidad: 213.41,
      margenPct: 61.1,
      roiPct: 205.2,
    });
  });
});

describe("calcularPedido", () => {
  // Desglose de un pedido de Mercado Libre con dos productos (costos inventados)
  const pedido = {
    lineas: [
      {
        cantidad: 1,
        precio_unitario: 386.1,
        comision: 42.47,
        cargo_fijo: 0,
        costo_unitario: 250,
      },
      {
        cantidad: 1,
        precio_unitario: 318,
        comision: 34.98,
        cargo_fijo: 0,
        costo_unitario: 200,
      },
    ],
    costo_envio: 119.2,
    impuestos: 35.2,
  };

  it("el envío y los impuestos son del pedido", () => {
    expect(calcularPedido(pedido)).toEqual({
      piezas: 2,
      ingreso: 704.1,
      cargos: 77.45,
      neto: 472.25,
      costo: 450,
      utilidad: 22.25,
      margenPct: 3.2,
      roiPct: 4.9,
      lineasSinCosto: 0,
    });
  });

  it("si falta el costo de una línea no hay utilidad", () => {
    const r = calcularPedido({
      ...pedido,
      lineas: [{ ...pedido.lineas[0], costo_unitario: null }, pedido.lineas[1]],
    });
    expect(r.neto).toBe(472.25);
    expect(r.costo).toBeNull();
    expect(r.utilidad).toBeNull();
    expect(r.lineasSinCosto).toBe(1);
  });

  it("una línea con varias piezas", () => {
    const r = calcularPedido({
      lineas: [
        {
          cantidad: 2,
          precio_unitario: 349,
          comision: 100,
          cargo_fijo: 0,
          costo_unitario: 104.5,
        },
      ],
      costo_envio: 60,
      impuestos: 62,
    });
    expect(r).toMatchObject({
      ingreso: 698,
      neto: 476,
      costo: 209,
      utilidad: 267,
      margenPct: 38.3,
      roiPct: 127.8,
    });
  });
});

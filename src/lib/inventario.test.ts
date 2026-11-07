import { describe, expect, it } from "vitest";
import { calcularResumen, calcularRoas } from "./finanzas";
import { calcularInventario, valorInventario, type Evento } from "./inventario";

describe("calcularRoas", () => {
  it("ventas atribuidas entre gasto", () => {
    expect(calcularRoas(1000, 200)).toBe(5);
    expect(calcularRoas(350, 100)).toBe(3.5);
    expect(calcularRoas(1, 3)).toBe(0.33);
  });
  it("sin gasto no hay ROAS", () => expect(calcularRoas(100, 0)).toBeNull());
});

describe("calcularResumen", () => {
  const conCosto = {
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
  };
  const sinCosto = {
    lineas: [
      {
        cantidad: 1,
        precio_unitario: 200,
        comision: 20,
        cargo_fijo: 0,
        costo_unitario: null,
      },
    ],
    costo_envio: 0,
    impuestos: 0,
  };

  it("resta gastos y publicidad a la utilidad de los pedidos", () => {
    expect(
      calcularResumen({
        pedidos: [conCosto, sinCosto],
        gastos: [100.5, 50],
        publicidad: [200],
      }),
    ).toEqual({
      ingresos: 898,
      utilidadVentas: 267,
      ventasSinCosto: 1,
      gastos: 150.5,
      publicidad: 200,
      utilidadNeta: -83.5,
    });
  });
  it("sin movimientos todo es cero", () => {
    expect(
      calcularResumen({ pedidos: [], gastos: [], publicidad: [] }).utilidadNeta,
    ).toBe(0);
  });
});

describe("ajustes de existencias", () => {
  it("inventario inicial con costo", () => {
    const eventos: Evento[] = [
      {
        tipo: "ajuste",
        fecha: "2026-01-01",
        creado: "a",
        cantidad: 10,
        costo_unitario: 80,
      },
    ];
    expect(calcularInventario(eventos)).toEqual({
      stock: 10,
      costoPromedio: 80,
      ultimoCosto: null,
    });
  });

  it("ajuste que suma sin costo no mueve el promedio", () => {
    const eventos: Evento[] = [
      {
        tipo: "compra",
        fecha: "2026-01-01",
        creado: "a",
        cantidad: 5,
        costo_unitario: 100,
      },
      {
        tipo: "ajuste",
        fecha: "2026-01-02",
        creado: "b",
        cantidad: 5,
        costo_unitario: null,
      },
    ];
    const r = calcularInventario(eventos);
    expect(r.stock).toBe(10);
    expect(r.costoPromedio).toBe(100);
  });

  it("ajuste que suma con costo se mezcla como una compra", () => {
    const eventos: Evento[] = [
      {
        tipo: "compra",
        fecha: "2026-01-01",
        creado: "a",
        cantidad: 5,
        costo_unitario: 100,
      },
      {
        tipo: "ajuste",
        fecha: "2026-01-02",
        creado: "b",
        cantidad: 5,
        costo_unitario: 120,
      },
    ];
    const r = calcularInventario(eventos);
    expect(r.stock).toBe(10);
    expect(r.costoPromedio).toBe(110);
  });

  it("merma baja existencias sin tocar el costo", () => {
    const eventos: Evento[] = [
      {
        tipo: "compra",
        fecha: "2026-01-01",
        creado: "a",
        cantidad: 10,
        costo_unitario: 100,
      },
      {
        tipo: "ajuste",
        fecha: "2026-01-02",
        creado: "b",
        cantidad: -2,
        costo_unitario: null,
      },
    ];
    const r = calcularInventario(eventos);
    expect(r.stock).toBe(8);
    expect(r.costoPromedio).toBe(100);
  });

  it("en el mismo día el ajuste va antes que la venta", () => {
    const eventos: Evento[] = [
      { tipo: "venta", fecha: "2026-01-01", creado: "a", cantidad: 2 },
      {
        tipo: "ajuste",
        fecha: "2026-01-01",
        creado: "b",
        cantidad: 5,
        costo_unitario: 50,
      },
    ];
    const r = calcularInventario(eventos);
    expect(r.stock).toBe(3);
    expect(r.costoPromedio).toBe(50);
  });
});

describe("valorInventario", () => {
  it("suma existencias por costo promedio", () => {
    expect(
      valorInventario([
        { stock: 5, costoPromedio: 104 },
        { stock: 3, costoPromedio: 86.6667 },
      ]),
    ).toBe(780);
  });
  it("ignora existencias negativas y productos sin costo", () => {
    expect(
      valorInventario([
        { stock: -2, costoPromedio: 50 },
        { stock: 4, costoPromedio: null },
        { stock: 2, costoPromedio: 10 },
      ]),
    ).toBe(20);
  });
  it("sin productos vale 0", () => expect(valorInventario([])).toBe(0));
});

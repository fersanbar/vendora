import { calcularResumen, type ResumenFinanzas } from '@/lib/finanzas'
import { calcularFlujo, type ResultadoFlujo } from '@/lib/flujo'
import type { LocalSale, LocalSaleItem } from '@/lib/db'
import { calcularPedido, sumar, totalLinea, type DatosPedido } from '@/lib/money'
import type { DatosFinancieros } from './useDatosFinancieros'

export function pedidoDe(venta: LocalSale, lineas: Map<string, LocalSaleItem[]>): DatosPedido {
  return { lineas: lineas.get(venta.id) ?? [], costo_envio: venta.costo_envio, impuestos: venta.impuestos }
}

export function resumenDelMes(d: DatosFinancieros, periodo: string): ResumenFinanzas {
  return calcularResumen({
    pedidos: d.ventas.filter((v) => v.fecha.startsWith(periodo)).map((v) => pedidoDe(v, d.lineas)),
    gastos: d.gastos.filter((g) => g.fecha.startsWith(periodo)).map((g) => g.monto),
    publicidad: d.anuncios.filter((a) => a.fecha.startsWith(periodo)).map((a) => a.monto),
  })
}

export function flujoDelMes(d: DatosFinancieros, periodo: string): ResultadoFlujo {
  const totalesCompra = new Map<string, number[]>()
  for (const i of d.comprasItems) {
    const lista = totalesCompra.get(i.purchase_id) ?? []
    lista.push(totalLinea(i.cantidad, i.costo_unitario))
    totalesCompra.set(i.purchase_id, lista)
  }

  return calcularFlujo({
    periodo,
    ventas: d.ventas.map((v) => ({
      estado: v.estado_cobro,
      fechaLiberacion: v.fecha_liberacion_real,
      neto: calcularPedido(pedidoDe(v, d.lineas)).neto,
    })),
    compras: d.compras.map((c) => ({ fecha: c.fecha, monto: sumar(totalesCompra.get(c.id) ?? []) })),
    gastos: d.gastos.map((g) => ({ fecha: g.fecha, monto: g.monto })),
    publicidad: d.anuncios.map((a) => ({ fecha: a.fecha, monto: a.monto })),
  })
}
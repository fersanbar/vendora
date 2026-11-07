export type OrigenCosto = 'compras' | 'referencia'

// Con compras (o ajustes con costo) manda el costo promedio real; si no, el de referencia
export function resolverCosto(
  costoPromedio: number | null | undefined,
  costoReferencia: number | null | undefined,
): { valor: number | null; origen: OrigenCosto | null } {
  if (typeof costoPromedio === 'number') return { valor: costoPromedio, origen: 'compras' }
  if (typeof costoReferencia === 'number') return { valor: costoReferencia, origen: 'referencia' }
  return { valor: null, origen: null }
}
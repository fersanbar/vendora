import { describe, expect, it } from 'vitest'
import { resolverCosto } from './costo'

describe('resolverCosto', () => {
  it('el costo de compras manda sobre la referencia', () => {
    expect(resolverCosto(100, 150)).toEqual({ valor: 100, origen: 'compras' })
  })
  it('sin compras usa la referencia', () => {
    expect(resolverCosto(null, 150)).toEqual({ valor: 150, origen: 'referencia' })
    expect(resolverCosto(undefined, 150)).toEqual({ valor: 150, origen: 'referencia' })
  })
  it('un costo de 0 es un costo válido', () => {
    expect(resolverCosto(null, 0)).toEqual({ valor: 0, origen: 'referencia' })
  })
  it('sin ninguno no hay costo', () => {
    expect(resolverCosto(null, null)).toEqual({ valor: null, origen: null })
  })
})
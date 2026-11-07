const dos = (n: number) => String(n).padStart(2, '0')

export function hoyLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

export function periodoActual(): string {
  return hoyLocal().slice(0, 7)
}

export function moverPeriodo(periodo: string, delta: number): string {
  const [y, m] = periodo.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}`
}

export function etiquetaPeriodo(periodo: string): string {
  const [y, m] = periodo.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1))
}

export function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  )
}

export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const f = new Date(y, m - 1, d + dias)
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`
}

export function ultimosPeriodos(periodo: string, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => moverPeriodo(periodo, i - (cantidad - 1)))
}

export function etiquetaMesCorta(periodo: string): string {
  const [y, m] = periodo.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(new Date(y, m - 1, 1)).replace('.', '')
}
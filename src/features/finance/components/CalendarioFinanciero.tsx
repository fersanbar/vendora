
import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ShoppingCart,
  Wallet,
  Megaphone,
  ArrowDownLeft,
  ArrowUpRight,
  Clock3,
} from 'lucide-react'

import type { DatosFinancieros } from '@/features/finance/useDatosFinancieros'
import { calcularPedido, totalLinea, sumar, formatMXN } from '@/lib/money'

type TipoEvento = 'venta' | 'gasto' | 'compra' | 'publicidad' | 'liberacion'

interface Evento {
  id: string
  fecha: string
  tipo: TipoEvento
  titulo: string
  descripcion: string
  monto: number
  estado?: 'pendiente' | 'liberado'
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

function fechaLocal(fecha: Date): string {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function construirEventos(datos: DatosFinancieros): Evento[] {
  const eventos: Evento[] = []

  for (const venta of datos.ventas) {
    const lineas = (datos.lineas.get(venta.id) ?? [])
      .filter((l) => l.deleted_at === null)

    const pedido = calcularPedido({
      lineas,
      costo_envio: venta.costo_envio,
      impuestos: venta.impuestos,
    })

    const canal = datos.canales.find((c) => c.id === venta.channel_id)
    const descripcion = [
      canal?.nombre ?? 'Sin canal',
      venta.id_orden ? `Orden ${venta.id_orden}` : '',
    ].filter(Boolean).join(' · ')

    eventos.push({
      id: `venta-${venta.id}`,
      fecha: venta.fecha.slice(0, 10),
      tipo: 'venta',
      titulo: 'Venta registrada',
      descripcion,
      monto: pedido.neto,
    })

    const fechaLiberacion =
      venta.estado_cobro === 'liberado'
        ? venta.fecha_liberacion_real
        : venta.fecha_liberacion_estimada

    if (fechaLiberacion) {
      eventos.push({
        id: `liberacion-${venta.id}`,
        fecha: fechaLiberacion.slice(0, 10),
        tipo: 'liberacion',
        titulo: venta.estado_cobro === 'liberado'
          ? 'Dinero liberado'
          : 'Liberación estimada',
        descripcion,
        monto: pedido.neto,
        estado: venta.estado_cobro,
      })
    }
  }

  for (const gasto of datos.gastos) {
    eventos.push({
      id: `gasto-${gasto.id}`,
      fecha: gasto.fecha.slice(0, 10),
      tipo: 'gasto',
      titulo: gasto.concepto || 'Gasto',
      descripcion: gasto.notas || 'Gasto operativo',
      monto: gasto.monto,
    })
  }

  const comprasPorId = new Map<string, number[]>()

  for (const item of datos.comprasItems) {
    const lista = comprasPorId.get(item.purchase_id) ?? []
    lista.push(totalLinea(item.cantidad, item.costo_unitario))
    comprasPorId.set(item.purchase_id, lista)
  }

  for (const compra of datos.compras) {
    eventos.push({
      id: `compra-${compra.id}`,
      fecha: compra.fecha.slice(0, 10),
      tipo: 'compra',
      titulo: 'Compra de inventario',
      descripcion: compra.folio
        ? `Folio ${compra.folio}`
        : compra.notas || 'Entrada de mercancía',
      monto: sumar(comprasPorId.get(compra.id) ?? []),
    })
  }

  const nombres: Record<string, string> = {
    meta: 'Meta Ads',
    mercado_ads: 'Mercado Ads',
    amazon_ads: 'Amazon Ads',
    tiktok: 'TikTok Ads',
    google: 'Google Ads',
    otro: 'Otra publicidad',
  }

  for (const anuncio of datos.anuncios) {
    eventos.push({
      id: `publicidad-${anuncio.id}`,
      fecha: anuncio.fecha.slice(0, 10),
      tipo: 'publicidad',
      titulo: nombres[anuncio.plataforma] ?? 'Publicidad',
      descripcion: anuncio.notas || 'Inversión publicitaria',
      monto: anuncio.monto,
    })
  }

  return eventos.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.fecha))
}

function colorEvento(tipo: TipoEvento) {
  switch (tipo) {
    case 'venta':
      return 'bg-emerald-500'
    case 'gasto':
    case 'compra':
    case 'publicidad':
      return 'bg-rose-500'
    case 'liberacion':
      return 'bg-blue-500'
  }
}

function IconoEvento({ tipo }: { tipo: TipoEvento }) {
  const clases = 'size-4 shrink-0'

  switch (tipo) {
    case 'venta':
      return <ArrowDownLeft className={`${clases} text-emerald-600`} />
    case 'liberacion':
      return <Wallet className={`${clases} text-blue-600`} />
    case 'compra':
      return <ShoppingCart className={`${clases} text-rose-600`} />
    case 'publicidad':
      return <Megaphone className={`${clases} text-rose-600`} />
    case 'gasto':
      return <ArrowUpRight className={`${clases} text-rose-600`} />
  }
}

function TarjetaDia({
  etiqueta,
  valor,
  detalle,
  color,
  icono: Icono,
}: {
  etiqueta: string
  valor: string
  detalle?: string
  color: 'emerald' | 'rose' | 'blue'
  icono: typeof Wallet
}) {
  const estilos = {
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-700',
  }

  return (
    <div className={`min-w-0 rounded-2xl p-3 ${estilos[color]}`}>
      <div className="flex items-center gap-1.5">
        <Icono className="size-4 shrink-0" />
        <p className="truncate text-[11px] font-semibold">{etiqueta}</p>
      </div>
      <p className="mt-2 break-words text-base font-bold tracking-tight sm:text-lg">
        {valor}
      </p>
      {detalle && (
        <p className="mt-1 text-[10px] opacity-75">{detalle}</p>
      )}
    </div>
  )
}

export function CalendarioFinanciero({
  datos,
}: {
  datos: DatosFinancieros
}) {
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })

  const [diaSeleccionado, setDiaSeleccionado] = useState(
    () => fechaLocal(new Date()),
  )

  const eventos = useMemo(() => construirEventos(datos), [datos])

  const eventosPorDia = useMemo(() => {
    const mapa = new Map<string, Evento[]>()

    for (const evento of eventos) {
      const lista = mapa.get(evento.fecha) ?? []
      lista.push(evento)
      mapa.set(evento.fecha, lista)
    }

    return mapa
  }, [eventos])

  const diasDelMes = new Date(
    mes.getFullYear(),
    mes.getMonth() + 1,
    0,
  ).getDate()

  const primerDia = (mes.getDay() + 6) % 7

  const celdas = [
    ...Array.from({ length: primerDia }, () => null),
    ...Array.from({ length: diasDelMes }, (_, i) => i + 1),
  ]

  const eventosDia = eventosPorDia.get(diaSeleccionado) ?? []

  const ingresos = eventosDia
    .filter((e) => e.tipo === 'venta')
    .reduce((s, e) => s + e.monto, 0)

  const gastos = eventosDia
    .filter((e) =>
      ['gasto', 'compra', 'publicidad'].includes(e.tipo),
    )
    .reduce((s, e) => s + e.monto, 0)

  const liberaciones = eventosDia
    .filter((e) => e.tipo === 'liberacion' && e.estado === 'liberado')
    .reduce((s, e) => s + e.monto, 0)

  const pendientes = eventosDia
    .filter((e) => e.tipo === 'liberacion' && e.estado === 'pendiente')
    .reduce((s, e) => s + e.monto, 0)

  const flujoEfectivo = liberaciones - gastos
  const hoy = fechaLocal(new Date())

  const fechaTitulo = new Date(`${diaSeleccionado}T12:00:00`)
    .toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  function cambiarMes(cantidad: number) {
    const nuevoMes = new Date(
      mes.getFullYear(),
      mes.getMonth() + cantidad,
      1,
    )
    setMes(nuevoMes)

    const diaActual = Number(diaSeleccionado.slice(8, 10))
    const maximo = new Date(
      nuevoMes.getFullYear(),
      nuevoMes.getMonth() + 1,
      0,
    ).getDate()

    setDiaSeleccionado(
      fechaLocal(new Date(
        nuevoMes.getFullYear(),
        nuevoMes.getMonth(),
        Math.min(diaActual, maximo),
      )),
    )
  }

  function seleccionarHoy() {
    const fecha = new Date()
    setMes(new Date(fecha.getFullYear(), fecha.getMonth(), 1))
    setDiaSeleccionado(fechaLocal(fecha))
  }

  return (
    <section className="mt-6 space-y-4">
      {/* Resumen del día */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Resumen del día
            </h2>
            <p className="mt-0.5 text-xs capitalize text-slate-500">
              {fechaTitulo}
            </p>
          </div>
          {diaSeleccionado !== hoy && (
            <button
              type="button"
              onClick={seleccionarHoy}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
            >
              Ir a hoy
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <TarjetaDia
            etiqueta="Ingresos"
            valor={formatMXN(ingresos)}
            color="emerald"
            icono={ArrowDownLeft}
            detalle="Ventas registradas"
          />
          <TarjetaDia
            etiqueta="Gastos"
            valor={formatMXN(gastos)}
            color="rose"
            icono={ArrowUpRight}
            detalle="Compras y salidas"
          />
          <TarjetaDia
            etiqueta="Liberado"
            valor={formatMXN(liberaciones)}
            color="blue"
            icono={Wallet}
            detalle={
              pendientes > 0
                ? `${formatMXN(pendientes)} estimado`
                : 'Dinero disponible'
            }
          />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-slate-700">
              Flujo de efectivo del día
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Liberaciones reales menos gastos
            </p>
          </div>
          <p className={`text-base font-bold ${
            flujoEfectivo < 0 ? 'text-rose-600' : 'text-slate-900'
          }`}>
            {formatMXN(flujoEfectivo)}
          </p>
        </div>
      </div>

      {/* Calendario */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-bold text-slate-900">
            Calendario financiero
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Selecciona un día para consultar sus movimientos
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="size-5" />
            </button>

            <div className="text-center">
              <p className="font-bold text-slate-900">
                {MESES[mes.getMonth()]} {mes.getFullYear()}
              </p>
            </div>

            <button
              type="button"
              onClick={() => cambiarMes(1)}
              className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1">
            {DIAS.map((dia, i) => (
              <div
                key={i}
                className="pb-2 text-center text-[11px] font-semibold text-slate-400"
              >
                {dia}
              </div>
            ))}

            {celdas.map((dia, i) => {
              if (!dia) return <div key={`vacio-${i}`} />

              const fecha = fechaLocal(
                new Date(mes.getFullYear(), mes.getMonth(), dia),
              )

              const movimientos = eventosPorDia.get(fecha) ?? []
              const tipos = [...new Set(movimientos.map((e) => e.tipo))]
              const seleccionado = fecha === diaSeleccionado
              const esHoy = fecha === hoy

              return (
                <button
                  key={fecha}
                  type="button"
                  onClick={() => setDiaSeleccionado(fecha)}
                  className={`flex min-h-[62px] flex-col items-center rounded-xl border p-1.5 transition sm:min-h-[72px] ${
                    seleccionado
                      ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                      : esHoy
                        ? 'border-violet-200 bg-violet-50/40'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-semibold ${
                    seleccionado ? 'text-violet-700' : 'text-slate-700'
                  }`}>
                    {dia}
                  </span>

                  <div className="mt-2 flex min-h-2 flex-wrap justify-center gap-1">
                    {tipos.map((tipo) => (
                      <span
                        key={tipo}
                        className={`size-1.5 rounded-full ${colorEvento(tipo)}`}
                      />
                    ))}
                  </div>

                  {movimientos.length > 0 && (
                    <span className="mt-1 text-[9px] font-medium text-slate-400">
                      {movimientos.length} mov.
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
            {[
              { tipo: 'venta' as const, texto: 'Ingresos' },
              { tipo: 'gasto' as const, texto: 'Gastos' },
              { tipo: 'liberacion' as const, texto: 'Liberaciones' },
            ].map((item) => (
              <div key={item.texto} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${colorEvento(item.tipo)}`} />
                <span className="text-[10px] text-slate-500">
                  {item.texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Movimientos de la fecha seleccionada */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-violet-600" />
            <div>
              <h3 className="text-sm font-bold capitalize text-slate-900">
                Movimientos del día
              </h3>
              <p className="mt-0.5 text-xs capitalize text-slate-500">
                {fechaTitulo}
              </p>
            </div>
            <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
              {eventosDia.length}
            </span>
          </div>
        </div>

        <div className="p-4">
          {eventosDia.length === 0 ? (
            <div className="py-6 text-center">
              <CalendarDays className="mx-auto size-7 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">
                No hay movimientos este día
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Selecciona otra fecha para consultar sus movimientos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {eventosDia.map((evento) => (
                <div key={evento.id} className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                    <IconoEvento tipo={evento.tipo} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {evento.titulo}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {evento.descripcion}
                    </p>

                    {evento.estado === 'pendiente' && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <Clock3 className="size-3" />
                        Fecha estimada · Pendiente
                      </span>
                    )}
                  </div>

                  <span className={`shrink-0 text-sm font-bold ${
                    evento.tipo === 'venta'
                      ? 'text-emerald-600'
                      : evento.tipo === 'liberacion'
                        ? 'text-blue-600'
                        : 'text-rose-600'
                  }`}>
                    {evento.tipo === 'venta'
                      ? '+'
                      : evento.tipo === 'liberacion'
                        ? evento.estado === 'pendiente' ? '~' : '+'
                        : '-'}
                    {formatMXN(evento.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

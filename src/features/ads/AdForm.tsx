
import { useState, type ChangeEvent } from 'react'
import {
  Loader2,
  Trash2,
  Megaphone,
  TrendingUp,
  Target,
  CalendarDays,
  Wallet,
  Info,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type {
  LocalAdSpend,
  LocalChannel,
  LocalProduct,
} from '@/lib/db'
import { hoyLocal } from '@/lib/dates'
import { calcularRoas } from '@/lib/finanzas'
import { formatMXN, parseMonto } from '@/lib/money'
import { useSync } from '@/features/sync/useSync'
import { deleteAd, saveAd } from './ads.repo'
import { PLATAFORMAS } from './plataformas'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

interface Props {
  anuncio: LocalAdSpend | null
  canales: LocalChannel[]
  productos: LocalProduct[]
  onDone: () => void
}

const selectClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100'

export function AdForm({
  anuncio,
  canales,
  productos,
  onDone,
}: Props) {
  const { db, syncNow } = useSync()

  const [fecha, setFecha] = useState(anuncio?.fecha ?? hoyLocal())
  const [plataforma, setPlataforma] = useState<
    LocalAdSpend['plataforma']
  >(anuncio?.plataforma ?? 'meta')
  const [monto, setMonto] = useState(
    anuncio ? String(anuncio.monto) : '',
  )
  const [atribuidas, setAtribuidas] = useState(
    anuncio && anuncio.ventas_atribuidas !== null
      ? String(anuncio.ventas_atribuidas)
      : '',
  )
  const [canalId, setCanalId] = useState(anuncio?.channel_id ?? '')
  const [productoId, setProductoId] = useState(anuncio?.product_id ?? '')
  const [notas, setNotas] = useState(anuncio?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canalesOpc = canales
    .filter((c) => c.activo || c.id === anuncio?.channel_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const productosOpc = productos
    .filter((p) => p.deleted_at === null || p.id === anuncio?.product_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const montoN = parseMonto(monto)
  const atribuidasN =
    atribuidas.trim() === '' ? null : parseMonto(atribuidas)

  const roas =
    montoN !== null && montoN > 0 && atribuidasN !== null
      ? calcularRoas(atribuidasN, montoN)
      : null

  async function guardar() {
    if (!FECHA.test(fecha)) {
      setError('Elige una fecha válida.')
      return
    }

    if (montoN === null || montoN <= 0) {
      setError(
        'Captura un gasto mayor a 0, con máximo 2 decimales.',
      )
      return
    }

    if (atribuidas.trim() !== '' && atribuidasN === null) {
      setError(
        'Revisa las ventas atribuidas: máximo 2 decimales.',
      )
      return
    }

    setGuardando(true)
    setError(null)

    try {
      await saveAd(
        db,
        {
          fecha,
          plataforma,
          monto: montoN,
          ventas_atribuidas: atribuidasN,
          channel_id: canalId === '' ? null : canalId,
          product_id: productoId === '' ? null : productoId,
          notas: notas.trim() === '' ? null : notas.trim(),
        },
        anuncio?.id,
      )

      onDone()
      void syncNow()
    } catch {
      setError('No se pudo guardar el registro.')
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!anuncio || eliminando) return

    setEliminando(true)
    setError(null)

    try {
      await deleteAd(db, anuncio.id)
      onDone()
      void syncNow()
    } catch {
      setError('No se pudo eliminar el registro.')
      setEliminando(false)
    }
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto bg-slate-50/70">
      {/* Encabezado */}
      <DrawerHeader className="border-b border-slate-200 bg-white px-5 pb-5 pt-5 text-left">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Megaphone className="size-5" />
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-violet-600">
              VENDORA
            </p>
            <p className="text-xs text-slate-400">
              Gestión de publicidad
            </p>
          </div>
        </div>

        <DrawerTitle className="text-xl font-bold tracking-tight text-slate-900">
          {anuncio ? 'Editar publicidad' : 'Nuevo gasto en publicidad'}
        </DrawerTitle>

        <DrawerDescription className="mt-1 text-sm leading-relaxed text-slate-500">
          Registra tu inversión y mide los resultados que genera.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-5 px-5 pb-8 pt-5">
        {/* Inversión */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Información del gasto
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="fecha"
              label="Fecha"
              type="date"
              value={fecha}
              onChange={setFecha}
              maxLength={10}
            />

            <Campo
              id="monto"
              label="Gasto (MXN)"
              value={monto}
              onChange={setMonto}
              maxLength={13}
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="plataforma"
              className="text-sm font-semibold text-slate-700"
            >
              Plataforma
            </Label>

            <select
              id="plataforma"
              value={plataforma}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setPlataforma(
                  e.target.value as LocalAdSpend['plataforma'],
                )
              }
              className={selectClass}
            >
              {PLATAFORMAS.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Rendimiento */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Rendimiento de campaña
            </h3>
          </div>

          <Campo
            id="atribuidas"
            label="Ventas atribuidas (MXN, opcional)"
            value={atribuidas}
            onChange={setAtribuidas}
            maxLength={13}
            inputMode="decimal"
          />

          {roas !== null ? (
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#172554] to-[#6336A9] p-4 text-white shadow-md shadow-indigo-950/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-100">
                    Retorno de inversión publicitaria
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {roas}x
                  </p>
                </div>

                <div className="flex size-11 items-center justify-center rounded-xl bg-white/10">
                  <TrendingUp className="size-6 text-violet-200" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
                <div>
                  <p className="text-[11px] text-indigo-200">
                    Inversión
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatMXN(montoN ?? 0)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-indigo-200">
                    Ventas atribuidas
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatMXN(atribuidasN ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3">
              <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <p className="text-xs leading-relaxed text-slate-500">
                Agrega las ventas que generó tu publicidad para calcular
                automáticamente el ROAS.
              </p>
            </div>
          )}
        </section>

        {/* Destino */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Destino de la publicidad
            </h3>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="canal"
              className="text-sm font-semibold text-slate-700"
            >
              Canal al que apunta (opcional)
            </Label>

            <select
              id="canal"
              value={canalId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setCanalId(e.target.value)
              }
              className={selectClass}
            >
              <option value="">Ninguno</option>

              {canalesOpc.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="producto"
              className="text-sm font-semibold text-slate-700"
            >
              Producto (opcional)
            </Label>

            <select
              id="producto"
              value={productoId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setProductoId(e.target.value)
              }
              className={selectClass}
            >
              <option value="">Ninguno</option>

              {productosOpc.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Notas */}
        <section className="space-y-2">
          <Label
            htmlFor="notas"
            className="text-sm font-semibold text-slate-700"
          >
            Notas (opcional)
          </Label>

          <Campo
            id="notas"
            label=""
            value={notas}
            onChange={setNotas}
            maxLength={1000}
          />
        </section>

        {/* Errores */}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </p>
        )}

        {/* Acciones */}
        <div className="space-y-3 border-t border-slate-200 pt-5">
          <Button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || eliminando}
            className="h-12 w-full rounded-xl bg-[#172554] text-sm font-semibold text-white shadow-md shadow-indigo-950/10 transition hover:bg-[#263b78]"
          >
            {guardando ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando...
              </>
            ) : (
              anuncio ? 'Guardar cambios' : 'Registrar gasto'
            )}
          </Button>

          {anuncio &&
            (confirmando ? (
              <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-rose-800">
                  ¿Eliminar este registro?
                </p>
                <p className="text-xs text-rose-700">
                  Esta acción eliminará el gasto de publicidad.
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1 rounded-xl border-slate-200 bg-white"
                    disabled={eliminando}
                    onClick={() => setConfirmando(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 flex-1 rounded-xl"
                    disabled={eliminando}
                    onClick={() => void eliminar()}
                  >
                    {eliminando ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Sí, eliminar'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                disabled={guardando}
                onClick={() => setConfirmando(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Eliminar registro
              </Button>
            ))}
        </div>
      </div>
    </div>
  )
}

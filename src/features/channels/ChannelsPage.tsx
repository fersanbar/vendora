
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  ChevronLeft,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
  Store,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Layers3,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createChannel,
  deleteChannel,
  listChannels,
  setChannelActive,
  type Channel,
} from './channels.service'
import { useSync } from '@/features/sync/useSync'

export function ChannelsPage() {
  const [canales, setCanales] = useState<Channel[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [procesando, setProcesando] = useState<string | null>(null)

  const { syncNow } = useSync()

  useEffect(() => {
    let activo = true

    listChannels()
      .then((resultado) => {
        if (activo) setCanales(resultado)
      })
      .catch(() => {
        if (activo) setError('No se pudieron cargar los canales.')
      })

    return () => {
      activo = false
    }
  }, [])

  async function agregar(e: FormEvent) {
    e.preventDefault()

    const nombre = nuevo.trim()
    if (!nombre || agregando) return

    setAgregando(true)
    setError(null)

    try {
      const creado = await createChannel(nombre)

      setCanales((prev) =>
        [...(prev ?? []), creado].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es'),
        ),
      )

      setNuevo('')
      void syncNow()
    } catch (err) {
      const codigo = (err as { code?: string }).code

      setError(
        codigo === '23505'
          ? 'Ya tienes un canal con ese nombre.'
          : 'No se pudo agregar el canal.',
      )
    } finally {
      setAgregando(false)
    }
  }

  async function cambiarEstado(canal: Channel, activo: boolean) {
    if (procesando) return

    setError(null)
    setProcesando(canal.id)

    try {
      await setChannelActive(canal.id, activo)

      setCanales((prev) =>
        prev?.map((c) =>
          c.id === canal.id ? { ...c, activo } : c,
        ) ?? null,
      )

      void syncNow()
    } catch {
      setError('No se pudo actualizar el canal.')
    } finally {
      setProcesando(null)
    }
  }

  async function eliminar(canal: Channel) {
    if (procesando) return

    setError(null)
    setProcesando(canal.id)

    try {
      await deleteChannel(canal.id)

      setCanales((prev) =>
        prev?.filter((c) => c.id !== canal.id) ?? null,
      )

      setConfirmando(null)
      void syncNow()
    } catch (err) {
      const codigo = (err as { code?: string }).code

      setError(
        codigo === '23503'
          ? 'Este canal ya tiene ventas o productos ligados. Déjalo archivado para conservar tu historial.'
          : 'No se pudo eliminar el canal.',
      )
    } finally {
      setProcesando(null)
    }
  }

  const activos = canales?.filter((c) => c.activo) ?? []
  const archivados = canales?.filter((c) => !c.activo) ?? []

  function FilaCanal({ canal }: { canal: Channel }) {
    const estaConfirmando = confirmando === canal.id
    const estaProcesando = procesando === canal.id

    return (
      <li className="list-none">
        {estaConfirmando ? (
          <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <Trash2 className="size-4" />
              </div>

              <div>
                <p className="text-sm font-semibold text-rose-900">
                  ¿Eliminar {canal.nombre}?
                </p>
                <p className="mt-0.5 text-xs text-rose-700">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="flex gap-2 sm:shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={estaProcesando}
                className="h-9 flex-1 rounded-lg border-slate-200 bg-white sm:flex-none"
                onClick={() => setConfirmando(null)}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={estaProcesando}
                className="h-9 flex-1 rounded-lg sm:flex-none"
                onClick={() => void eliminar(canal)}
              >
                {estaProcesando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Eliminar'
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div
            className={`group flex min-h-[76px] items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50 sm:px-4 ${
              canal.activo ? '' : 'opacity-75'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  canal.activo
                    ? 'bg-violet-50 text-violet-600'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <ShoppingBag className="size-5" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {canal.nombre}
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`size-1.5 rounded-full ${
                      canal.activo ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs text-slate-500">
                    {canal.activo ? 'Activo' : 'Archivado'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {estaProcesando ? (
                <div className="flex size-9 items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-violet-600" />
                </div>
              ) : (
                <>
                  {canal.activo ? (
                    <button
                      type="button"
                      onClick={() => void cambiarEstado(canal, false)}
                      className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                      aria-label={`Archivar ${canal.nombre}`}
                      title="Archivar canal"
                    >
                      <Archive className="size-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void cambiarEstado(canal, true)}
                      className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                      aria-label={`Restaurar ${canal.nombre}`}
                      title="Restaurar canal"
                    >
                      <RotateCcw className="size-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmando(canal.id)}
                    className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Eliminar ${canal.nombre}`}
                    title="Eliminar canal"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Navegación */}
        <Link
          to="/mas"
          className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-violet-600"
        >
          <ChevronLeft className="size-4" />
          Más opciones
        </Link>

        {/* Encabezado */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Store className="size-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Canales de venta
              </h1>
            </div>

            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
              Administra los lugares donde vendes y organiza tus operaciones.
            </p>
          </div>
        </div>

        {/* Resumen */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                Canales activos
              </p>
              <CheckCircle2 className="size-4 text-emerald-500" />
            </div>

            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {canales === null ? '—' : activos.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Disponibles para operar
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">
                Archivados
              </p>
              <Archive className="size-4 text-slate-400" />
            </div>

            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
              {canales === null ? '—' : archivados.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Conservan tu historial
            </p>
          </div>
        </div>

        {/* Crear canal */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Plus className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Agregar canal
              </h2>
              <p className="text-xs text-slate-500">
                Registra una nueva plataforma o punto de venta.
              </p>
            </div>
          </div>

          <form onSubmit={agregar} className="flex gap-2">
            <Input
              value={nuevo}
              maxLength={40}
              placeholder="Ej. Shopify, Amazon, Tienda física..."
              className="h-11 min-w-0 rounded-xl border-slate-200 bg-slate-50/50 shadow-none focus-visible:border-violet-400 focus-visible:ring-violet-100"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNuevo(e.target.value)
              }
            />

            <Button
              type="submit"
              disabled={agregando || !nuevo.trim()}
              className="h-11 shrink-0 rounded-xl bg-[#172554] px-4 text-white shadow-sm transition hover:bg-[#263b78]"
            >
              {agregando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Plus className="size-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Agregar</span>
                </>
              )}
              <span className="sr-only">Agregar canal</span>
            </Button>
          </form>
        </section>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Cargando */}
        {canales === null && !error && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-12 text-sm text-slate-500">
            <Loader2 className="size-5 animate-spin text-violet-600" />
            Cargando canales...
          </div>
        )}

        {/* Canales activos */}
        {canales !== null && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Tus canales
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Plataformas disponibles para registrar operaciones.
                </p>
              </div>

              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                {activos.length} activos
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/40">
              {activos.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {activos.map((canal) => (
                    <FilaCanal key={canal.id} canal={canal} />
                  ))}
                </ul>
              ) : (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <Layers3 className="size-6" />
                  </div>

                  <h3 className="mt-3 text-sm font-bold text-slate-900">
                    Aún no tienes canales activos
                  </h3>

                  <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                    Agrega tu primer canal para organizar tus ventas y productos.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Canales archivados */}
        {canales !== null && archivados.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-700">
                  Canales archivados
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Puedes restaurarlos cuando vuelvas a utilizarlos.
                </p>
              </div>

              <span className="rounded-full bg-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {archivados.length}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-200/40">
              <ul className="divide-y divide-slate-100">
                {archivados.map((canal) => (
                  <FilaCanal key={canal.id} canal={canal} />
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Nota informativa */}
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-3">
          <InfoIcon />
          <p className="text-xs leading-relaxed text-slate-500">
            La comisión, los cargos y los tiempos de liberación se configuran
            por producto. Archivar un canal conserva su historial.
          </p>
        </div>
      </div>
    </div>
  )
}

function InfoIcon() {
  return (
    <AlertCircle className="mt-0.5 size-4 shrink-0 text-slate-400" />
  )
}

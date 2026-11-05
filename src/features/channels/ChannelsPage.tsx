import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Archive, ChevronLeft, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react'
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
  const { syncNow } = useSync()

  useEffect(() => {
    listChannels()
      .then(setCanales)
      .catch(() => setError('No se pudieron cargar los canales.'))
  }, [])

  async function agregar(e: FormEvent) {
    e.preventDefault()
    const nombre = nuevo.trim()
    if (!nombre) return
    setAgregando(true)
    setError(null)
    try {
      const creado = await createChannel(nombre)
      setCanales((prev) =>
        [...(prev ?? []), creado].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      )
      setNuevo('')
      void syncNow()
    } catch (err) {
      const codigo = (err as { code?: string }).code
      setError(codigo === '23505' ? 'Ya tienes un canal con ese nombre.' : 'No se pudo agregar el canal.')
    }
    setAgregando(false)
  }

  async function cambiarEstado(canal: Channel, activo: boolean) {
    setError(null)
    try {
      await setChannelActive(canal.id, activo)
      setCanales((prev) => prev?.map((c) => (c.id === canal.id ? { ...c, activo } : c)) ?? null)
      void syncNow()
    } catch {
      setError('No se pudo actualizar el canal.')
    }
  }

  async function eliminar(canal: Channel) {
    setError(null)
    try {
      await deleteChannel(canal.id)
      setCanales((prev) => prev?.filter((c) => c.id !== canal.id) ?? null)
      void syncNow()
    } catch (err) {
      const codigo = (err as { code?: string }).code
      setError(
        codigo === '23503'
          ? 'Este canal ya tiene ventas o productos ligados. Déjalo archivado para conservar tu historial.'
          : 'No se pudo eliminar el canal.',
      )
    }
    setConfirmando(null)
  }

  function fila(c: Channel) {
    if (confirmando === c.id) {
      return (
        <li key={c.id} className="flex h-14 items-center justify-between gap-2 px-4">
          <span className="truncate text-sm">¿Eliminar {c.nombre}?</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setConfirmando(null)}>
              Cancelar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => eliminar(c)}>
              Eliminar
            </Button>
          </div>
        </li>
      )
    }
    return (
      <li
        key={c.id}
        className={`flex h-14 items-center justify-between px-4 ${c.activo ? '' : 'text-neutral-400'}`}
      >
        <span>{c.nombre}</span>
        <div className="flex">
          {c.activo ? (
            <button
              onClick={() => cambiarEstado(c, false)}
              className="flex size-10 items-center justify-center text-neutral-400"
              aria-label={`Archivar ${c.nombre}`}
            >
              <Archive className="size-5" />
            </button>
          ) : (
            <button
              onClick={() => cambiarEstado(c, true)}
              className="flex size-10 items-center justify-center"
              aria-label={`Restaurar ${c.nombre}`}
            >
              <RotateCcw className="size-5" />
            </button>
          )}
          <button
            onClick={() => setConfirmando(c.id)}
            className="flex size-10 items-center justify-center text-red-500"
            aria-label={`Eliminar ${c.nombre}`}
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      </li>
    )
  }

  const activos = canales?.filter((c) => c.activo) ?? []
  const archivados = canales?.filter((c) => !c.activo) ?? []

  return (
    <div className="px-4 pb-6 pt-4">
      <Link to="/mas" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Más
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Canales de venta</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Dónde vendes. La comisión y la liberación se configuran por producto.
      </p>

      <form onSubmit={agregar} className="mt-5 flex gap-2">
        <Input
          value={nuevo}
          maxLength={40}
          placeholder="Nuevo canal (ej. Shopify)"
          className="h-11"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNuevo(e.target.value)}
        />
        <Button type="submit" disabled={agregando || !nuevo.trim()} className="h-11 px-4">
          {agregando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          <span className="sr-only">Agregar canal</span>
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {!canales && !error && (
        <Loader2 className="mx-auto mt-6 size-5 animate-spin text-neutral-400" />
      )}

      <ul className="mt-5 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {activos.map(fila)}
        {canales && activos.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">
            No tienes canales activos. Agrega uno arriba.
          </li>
        )}
      </ul>

      {archivados.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium text-neutral-500">Archivados</h2>
          <ul className="mt-2 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {archivados.map(fila)}
          </ul>
        </>
      )}
    </div>
  )
}
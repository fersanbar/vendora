import { useState, type ChangeEvent } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type { LocalAdSpend, LocalChannel, LocalProduct } from '@/lib/db'
import { hoyLocal } from '@/lib/dates'
import { calcularRoas } from '@/lib/finanzas'
import { parseMonto } from '@/lib/money'
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

export function AdForm({ anuncio, canales, productos, onDone }: Props) {
  const { db, syncNow } = useSync()
  const [fecha, setFecha] = useState(anuncio?.fecha ?? hoyLocal())
  const [plataforma, setPlataforma] = useState<LocalAdSpend['plataforma']>(anuncio?.plataforma ?? 'meta')
  const [monto, setMonto] = useState(anuncio ? String(anuncio.monto) : '')
  const [atribuidas, setAtribuidas] = useState(
    anuncio && anuncio.ventas_atribuidas !== null ? String(anuncio.ventas_atribuidas) : '',
  )
  const [canalId, setCanalId] = useState(anuncio?.channel_id ?? '')
  const [productoId, setProductoId] = useState(anuncio?.product_id ?? '')
  const [notas, setNotas] = useState(anuncio?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canalesOpc = canales
    .filter((c) => c.activo || c.id === anuncio?.channel_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const productosOpc = productos
    .filter((p) => p.deleted_at === null || p.id === anuncio?.product_id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  const montoN = parseMonto(monto)
  const atribuidasN = atribuidas.trim() === '' ? null : parseMonto(atribuidas)
  const roas = montoN !== null && atribuidasN !== null ? calcularRoas(atribuidasN, montoN) : null

  async function guardar() {
    if (!FECHA.test(fecha)) return setError('Elige la fecha.')
    if (montoN === null || montoN <= 0) return setError('Captura un gasto mayor a 0, con máximo 2 decimales.')
    if (atribuidas.trim() !== '' && atribuidasN === null) {
      return setError('Revisa las ventas atribuidas: máximo 2 decimales.')
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
    if (!anuncio) return
    await deleteAd(db, anuncio.id)
    onDone()
    void syncNow()
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="text-left">
        <DrawerTitle>{anuncio ? 'Editar publicidad' : 'Nuevo gasto en publicidad'}</DrawerTitle>
        <DrawerDescription>Captura lo que gastaste y, si lo sabes, las ventas que te atribuye la plataforma.</DrawerDescription>
      </DrawerHeader>

      <div className="space-y-4 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <Campo id="fecha" label="Fecha" type="date" value={fecha} onChange={setFecha} maxLength={10} />
          <Campo id="monto" label="Gasto (MXN)" value={monto} onChange={setMonto} maxLength={13} inputMode="decimal" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plataforma">Plataforma</Label>
          <select
            id="plataforma"
            value={plataforma}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setPlataforma(e.target.value as LocalAdSpend['plataforma'])}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
          >
            {PLATAFORMAS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <Campo
          id="atribuidas"
          label="Ventas atribuidas (MXN, opcional)"
          value={atribuidas}
          onChange={setAtribuidas}
          maxLength={13}
          inputMode="decimal"
        />
        {roas !== null && <p className="text-sm font-medium">ROAS: {roas}x</p>}

        <div className="space-y-1.5">
          <Label htmlFor="canal">Canal al que apunta (opcional)</Label>
          <select
            id="canal"
            value={canalId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setCanalId(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
          >
            <option value="">Ninguno</option>
            {canalesOpc.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="producto">Producto (opcional)</Label>
          <select
            id="producto"
            value={productoId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setProductoId(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
          >
            <option value="">Ninguno</option>
            {productosOpc.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <Campo id="notas" label="Notas (opcional)" value={notas} onChange={setNotas} maxLength={1000} />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="button" onClick={() => void guardar()} disabled={guardando} className="h-11 w-full">
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar
        </Button>

        {anuncio &&
          (confirmando ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" className="h-11 flex-1" onClick={() => void eliminar()}>
                Sí, eliminar
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="h-11 w-full text-red-600" onClick={() => setConfirmando(true)}>
              <Trash2 className="mr-2 size-4" />
              Eliminar registro
            </Button>
          ))}
      </div>
    </div>
  )
}
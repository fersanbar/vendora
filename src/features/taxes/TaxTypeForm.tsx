import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type { LocalTaxType } from '@/lib/db'
import { parsePorcentaje } from '@/lib/money'
import { useSync } from '@/features/sync/useSync'
import { deleteTaxType, saveTaxType, setTaxTypeActive } from './taxes.repo'

export function TaxTypeForm({ tipo, onDone }: { tipo: LocalTaxType | null; onDone: () => void }) {
  const { db, syncNow } = useSync()
  const [nombre, setNombre] = useState(tipo?.nombre ?? '')
  const [clave, setClave] = useState<LocalTaxType['clave']>(tipo?.clave ?? 'otro')
  const [tasa, setTasa] = useState(tipo && tipo.tasa_pct !== null ? String(tipo.tasa_pct) : '')
  const [guardando, setGuardando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const n = nombre.trim()
    if (!n) {
      setError('El nombre es obligatorio.')
      return
    }
    const tasaN = tasa.trim() === '' ? null : parsePorcentaje(tasa)
    if (tasa.trim() !== '' && tasaN === null) {
      setError('La tasa debe estar entre 0 y 100, con máximo 3 decimales.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await saveTaxType(db, { nombre: n, clave, tasa_pct: tasaN }, tipo?.id)
      onDone()
      void syncNow()
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'NOMBRE_DUPLICADO'
          ? 'Ya tienes un impuesto con ese nombre.'
          : 'No se pudo guardar el impuesto.',
      )
      setGuardando(false)
    }
  }

  async function alternarArchivo() {
    if (!tipo) return
    await setTaxTypeActive(db, tipo.id, !tipo.activo)
    onDone()
    void syncNow()
  }

  async function eliminar() {
    if (!tipo) return
    try {
      await deleteTaxType(db, tipo.id)
      onDone()
      void syncNow()
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'TIPO_EN_USO'
          ? 'Este impuesto ya tiene registros. Déjalo archivado para conservar tu historial.'
          : 'No se pudo eliminar el impuesto.',
      )
      setConfirmando(false)
    }
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="text-left">
        <DrawerTitle>{tipo ? 'Editar impuesto' : 'Nuevo tipo de impuesto'}</DrawerTitle>
        <DrawerDescription>La tasa es solo una referencia; la capturas tú.</DrawerDescription>
      </DrawerHeader>

      <form onSubmit={guardar} className="space-y-4 px-4 pb-6">
        <Campo id="nombre" label="Nombre" value={nombre} onChange={setNombre} maxLength={60} />

        <div className="space-y-1.5">
          <Label htmlFor="clave">Tipo</Label>
          <select
            id="clave"
            value={clave}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setClave(e.target.value as LocalTaxType['clave'])}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
          >
            <option value="iva">IVA</option>
            <option value="isr">ISR</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        <Campo id="tasa" label="Tasa de referencia (%) opcional" value={tasa} onChange={setTasa} maxLength={7} inputMode="decimal" />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={guardando} className="h-11 w-full">
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar
        </Button>

        {tipo && (
          <Button type="button" variant="outline" className="h-11 w-full" onClick={alternarArchivo}>
            {tipo.activo ? 'Archivar' : 'Restaurar'}
          </Button>
        )}

        {tipo &&
          (confirmando ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" className="h-11 flex-1" onClick={eliminar}>
                Sí, eliminar
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" className="h-11 w-full text-red-600" onClick={() => setConfirmando(true)}>
              <Trash2 className="mr-2 size-4" />
              Eliminar impuesto
            </Button>
          ))}
      </form>
    </div>
  )
}

import { useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Loader2,
  Trash2,
  ReceiptText,
  Percent,
  Archive,
  RotateCcw,
  AlertCircle,
} from 'lucide-react'
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
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-sm">
            <ReceiptText size={20} />
          </div>
          <span className="text-xs font-bold tracking-[0.16em] text-slate-400">
            VENDORA · CONFIGURACIÓN
          </span>
        </div>

        <DrawerTitle className="text-xl font-bold tracking-tight text-slate-900">
          {tipo ? 'Editar impuesto' : 'Nuevo tipo de impuesto'}
        </DrawerTitle>

        <DrawerDescription className="leading-relaxed text-slate-500">
          Configura el nombre, tipo y tasa de referencia del impuesto.
        </DrawerDescription>
      </DrawerHeader>

      <form onSubmit={guardar} className="space-y-5 px-4 pb-6">
        {/* Nombre */}
        <Campo
          id="nombre"
          label="Nombre"
          value={nombre}
          onChange={setNombre}
          maxLength={60}
        />

        {/* Tipo */}
        <div className="space-y-1.5">
          <Label htmlFor="clave" className="text-sm font-semibold text-slate-800">
            Tipo de impuesto
          </Label>
          <select
            id="clave"
            value={clave}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setClave(e.target.value as LocalTaxType['clave'])}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="iva">IVA</option>
            <option value="isr">ISR</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Tasa */}
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Percent size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Tasa de referencia
              </p>
              <p className="text-xs text-slate-500">
                Valor porcentual opcional
              </p>
            </div>
          </div>

          <Campo
            id="tasa"
            label="Tasa de referencia (%) opcional"
            value={tasa}
            onChange={setTasa}
            maxLength={7}
            inputMode="decimal"
          />

          <p className="text-xs leading-relaxed text-slate-500">
            La tasa es solo una referencia; tú decides el porcentaje que deseas registrar.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Guardar */}
        <Button
          type="submit"
          disabled={guardando}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] font-semibold shadow-md shadow-indigo-950/10 transition hover:opacity-95"
        >
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar
        </Button>

        {/* Archivar / restaurar */}
        {tipo && (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-slate-200 font-medium text-slate-700 hover:bg-slate-50"
            onClick={alternarArchivo}
          >
            {tipo.activo ? (
              <>
                <Archive className="mr-2 size-4" />
                Archivar impuesto
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 size-4" />
                Restaurar impuesto
              </>
            )}
          </Button>
        )}

        {/* Eliminar */}
        {tipo &&
          (confirmando ? (
            <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-600" />
                <div>
                  <p className="text-sm font-semibold text-rose-800">
                    ¿Eliminar este impuesto?
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-rose-700">
                    Esta acción no se puede deshacer. Si tiene registros asociados, no podrá eliminarse.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 flex-1 rounded-xl border-slate-200 bg-white"
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 flex-1 rounded-xl"
                  onClick={eliminar}
                >
                  <Trash2 className="mr-2 size-4" />
                  Sí, eliminar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => setConfirmando(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Eliminar impuesto
            </Button>
          ))}
      </form>
    </div>
  )
}

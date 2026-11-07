
import { useState } from 'react'
import { Loader2, Percent, Info, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Campo } from '@/components/Campo'
import { parsePorcentaje } from '@/lib/money'
import { useSync } from '@/features/sync/useSync'
import { saveIvaGeneral } from './taxes.repo'
import { useIvaGeneral } from './useIvaGeneral'

export function IvaGeneralCard() {
  const { db, syncNow } = useSync()
  const ivaGeneral = useIvaGeneral()
  const [edit, setEdit] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const valor = edit ?? String(ivaGeneral)

  async function guardar() {
    const n = valor.trim() === '' ? null : parsePorcentaje(valor)
    if (n === null) {
      setMsg({ ok: false, texto: 'Debe estar entre 0 y 100, con máximo 3 decimales.' })
      return
    }
    setGuardando(true)
    try {
      await saveIvaGeneral(db, n)
      setEdit(null)
      setMsg({ ok: true, texto: 'Guardado' })
      void syncNow()
    } catch (err) {
      setMsg({
        ok: false,
        texto:
          err instanceof Error && err.message === 'PERFIL_NO_DESCARGADO'
            ? 'Conéctate a internet una vez para cargar tu perfil.'
            : 'No se pudo guardar.',
      })
    }
    setGuardando(false)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Encabezado */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Percent size={20} />
        </div>
        <div>
          <p className="font-bold text-slate-900">IVA general</p>
          <p className="text-xs text-slate-500">Configuración fiscal de tu cuenta</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Información */}
        <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-violet-600" />
          <p className="text-xs leading-relaxed text-slate-600">
            Base de cálculo: todos los impuestos se sacan sobre el precio ÷ (1 + este %). Cada impuesto usa luego su propia tasa.
          </p>
        </div>

        {/* Campo y botón */}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Campo
              id="iva-general"
              label="Porcentaje (%)"
              value={valor}
              onChange={(v) => {
                setEdit(v)
                setMsg(null)
              }}
              maxLength={7}
              inputMode="decimal"
            />
          </div>

          <Button
            onClick={() => void guardar()}
            disabled={guardando || edit === null}
            className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] px-5 font-semibold shadow-sm transition hover:opacity-95"
          >
            {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
            Guardar
          </Button>
        </div>

        {/* Mensaje */}
        {msg && (
          <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
            msg.ok
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-rose-50 text-rose-700'
          }`}>
            {msg.ok
              ? <CheckCircle2 className="size-4 shrink-0" />
              : <AlertCircle className="size-4 shrink-0" />
            }
            {msg.texto}
          </div>
        )}
      </div>
    </div>
  )
}

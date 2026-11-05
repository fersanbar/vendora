import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
    <div className="mt-5 rounded-xl border border-neutral-200 p-4">
      <p className="font-medium">IVA general</p>
      <p className="mt-1 text-xs text-neutral-500">
        Base de cálculo: todos los impuestos se sacan sobre el precio ÷ (1 + este %). Cada impuesto usa luego su
        propia tasa.
      </p>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1">
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
        <Button onClick={() => void guardar()} disabled={guardando || edit === null} className="h-11">
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar
        </Button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.texto}</p>}
    </div>
  )
}
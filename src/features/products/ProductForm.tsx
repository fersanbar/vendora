
import { useState, type FormEvent } from 'react'
import {
  Barcode,
  Boxes,
  Loader2,
  Package,
  Tag,
  Trash2,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Campo } from '@/components/Campo'
import type { LocalProduct } from '@/lib/db'
import { useSync } from '@/features/sync/useSync'
import { deleteProduct, saveProduct } from './products.repo'
import { formatMXN, parseCosto } from '@/lib/money'

const vacioANull = (v: string) => (v.trim() === '' ? null : v.trim())

export function ProductForm({
  producto,
  onDone,
}: {
  producto: LocalProduct | null
  onDone: () => void
}) {
  const { db, syncNow } = useSync()

  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [sku, setSku] = useState(producto?.sku ?? '')
  const [codigo, setCodigo] = useState(producto?.codigo_barras ?? '')
  const [categoria, setCategoria] = useState(producto?.categoria ?? '')
  const [notas, setNotas] = useState(producto?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [costoRef, setCostoRef] = useState(
    producto && producto.costo_referencia != null
      ? String(producto.costo_referencia)
      : '',
  )

  const costoRefN =
    costoRef.trim() === '' ? null : parseCosto(costoRef)

  async function guardar(e: FormEvent) {
    e.preventDefault()

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    if (costoRef.trim() !== '' && costoRefN === null) {
      setError('Revisa el costo de referencia: máximo 4 decimales.')
      return
    }

    setGuardando(true)
    setError(null)

    try {
      await saveProduct(
        db,
        {
          nombre: nombre.trim(),
          sku: vacioANull(sku),
          codigo_barras: vacioANull(codigo),
          categoria: vacioANull(categoria),
          notas: vacioANull(notas),
          costo_referencia: costoRefN,
        },
        producto?.id,
      )

      onDone()
      void syncNow()
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'SKU_DUPLICADO'
          ? 'Ya tienes un producto con ese SKU.'
          : 'No se pudo guardar el producto.',
      )
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!producto || eliminando) return

    setEliminando(true)
    setError(null)

    try {
      await deleteProduct(db, producto.id)
      onDone()
      void syncNow()
    } catch {
      setError('No se pudo eliminar el producto.')
      setEliminando(false)
    }
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="border-b border-slate-100 px-5 pb-4 pt-5 text-left">
        <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Package className="size-5" />
        </div>

        <DrawerTitle className="text-xl font-bold tracking-tight text-slate-900">
          {producto ? 'Editar producto' : 'Nuevo producto'}
        </DrawerTitle>

        <DrawerDescription className="text-sm leading-relaxed text-slate-500">
          Administra la información, identificación y costo de tus productos.
        </DrawerDescription>
      </DrawerHeader>

      <form onSubmit={guardar} className="space-y-5 px-5 pb-7 pt-5">
        {/* Información general */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Boxes className="size-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Información general
            </h3>
          </div>

          <Campo
            id="nombre"
            label="Nombre del producto"
            value={nombre}
            onChange={setNombre}
            maxLength={120}
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="sku"
              label="SKU (automático si está vacío)"
              value={sku}
              onChange={setSku}
              maxLength={60}
            />

            <Campo
              id="categoria"
              label="Categoría"
              value={categoria}
              onChange={setCategoria}
              maxLength={60}
            />
          </div>

          <Campo
            id="codigo"
            label="Código de barras"
            value={codigo}
            onChange={setCodigo}
            maxLength={60}
            inputMode="numeric"
          />
        </section>

        {/* Costo de referencia */}
        <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-blue-50/60 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
              <Wallet className="size-4" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Costo de referencia
              </h3>
              <p className="text-[11px] text-slate-500">
                Opcional · Por pieza
              </p>
            </div>
          </div>

          <Campo
            id="costo-ref"
            label="Costo estimado (MXN)"
            value={costoRef}
            onChange={setCostoRef}
            maxLength={13}
            inputMode="decimal"
          />

          {costoRefN !== null && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-violet-100 bg-white/80 px-3 py-2">
              <span className="text-xs text-slate-500">
                Costo capturado
              </span>
              <span className="text-sm font-bold tabular-nums text-violet-700">
                {formatMXN(costoRefN)}
              </span>
            </div>
          )}

          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Se utiliza para estimar utilidad y ROI mientras no tengas compras
            registradas. Cuando registres compras, VENDORA utilizará el costo
            promedio de tu inventario.
          </p>
        </section>

        {/* Notas */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Tag className="size-4" />
            </div>

            <h3 className="text-sm font-bold text-slate-800">
              Información adicional
            </h3>
          </div>

          <Campo
            id="notas"
            label="Notas"
            value={notas}
            onChange={setNotas}
            maxLength={1000}
          />
        </section>

        {/* Información de sincronización */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <Barcode className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-500">
            Tu producto se guarda primero en este dispositivo y se sincroniza
            automáticamente cuando haya conexión a internet.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"
          >
            <span className="font-semibold">!</span>
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <Button
            type="submit"
            disabled={guardando || eliminando}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#172554] via-[#202f69] to-[#6336a9] font-semibold text-white shadow-md shadow-violet-900/10 transition hover:brightness-110"
          >
            {guardando ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando producto...
              </>
            ) : (
              producto ? 'Guardar cambios' : 'Crear producto'
            )}
          </Button>

          {producto && (
            confirmando ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                <p className="text-sm font-semibold text-rose-800">
                  ¿Eliminar este producto?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-rose-700">
                  Esta acción quitará el producto de tu inventario. Asegúrate
                  de que realmente deseas continuar.
                </p>

                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={eliminando}
                    className="h-10 flex-1 rounded-xl border-slate-200 bg-white"
                    onClick={() => setConfirmando(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    disabled={eliminando}
                    className="h-10 flex-1 rounded-xl"
                    onClick={() => void eliminar()}
                  >
                    {eliminando ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 size-4" />
                    )}
                    Sí, eliminar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                onClick={() => setConfirmando(true)}
              >
                <Trash2 className="mr-2 size-4" />
                Eliminar producto
              </Button>
            )
          )}
        </div>
      </form>
    </div>
  )
}

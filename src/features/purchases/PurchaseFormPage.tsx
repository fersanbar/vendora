
import { useState, type ChangeEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Package,
  Plus,
  ReceiptText,
  Store,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type {
  LocalProduct,
  LocalPurchase,
  LocalPurchaseItem,
  LocalSupplier,
} from '@/lib/db'
import { hoyLocal } from '@/lib/dates'
import { formatMXN, sumar, totalLinea } from '@/lib/money'
import { useSync } from '@/features/sync/useSync'
import { LineaCompraForm, type LineaEstado } from './LineaCompraForm'
import { METODOS_PAGO } from './metodos'
import {
  deletePurchase,
  savePurchase,
  type ProveedorInput,
} from './purchases.repo'
import { useProductStats } from './useProductStats'

const NUEVO = '__nuevo'

interface Props {
  compra: LocalPurchase | null
  items: LocalPurchaseItem[]
  proveedores: LocalSupplier[]
  productos: LocalProduct[]
}

const selectClass =
  'h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100'

function PurchaseForm({
  compra,
  items,
  proveedores,
  productos,
}: Props) {
  const { db, syncNow } = useSync()
  const navigate = useNavigate()
  const stats = useProductStats()

  const [fecha, setFecha] = useState(compra?.fecha ?? hoyLocal())
  const [proveedorSel, setProveedorSel] = useState(
    compra?.supplier_id ?? '',
  )
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [metodo, setMetodo] = useState<LocalPurchase['metodo_pago']>(
    compra?.metodo_pago ?? 'efectivo',
  )
  const [folio, setFolio] = useState(compra?.folio ?? '')
  const [notas, setNotas] = useState(compra?.notas ?? '')

  const [lineas, setLineas] = useState<LineaEstado[]>(() =>
    items.map((i) => ({
      key: i.id,
      id: i.id,
      product_id: i.product_id,
      cantidad: i.cantidad,
      costo_unitario: i.costo_unitario,
    })),
  )

  const [lineaAbierta, setLineaAbierta] = useState(false)
  const [lineaSel, setLineaSel] = useState<LineaEstado | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nombres = new Map(productos.map((p) => [p.id, p.nombre]))

  const total = sumar(
    lineas.map((l) => totalLinea(l.cantidad, l.costo_unitario)),
  )

  const unidades = lineas.reduce((acc, l) => acc + l.cantidad, 0)

  const proveedoresOrdenados = [...proveedores].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  )

  function abrirLinea(l: LineaEstado | null) {
    setLineaSel(l)
    setLineaAbierta(true)
    setError(null)
  }

  function guardarLinea(l: LineaEstado) {
    setLineas((prev) =>
      prev.some((x) => x.key === l.key)
        ? prev.map((x) => (x.key === l.key ? l : x))
        : [...prev, l],
    )

    setLineaAbierta(false)
    setError(null)
  }

  function quitarLinea(key: string) {
    setLineas((prev) => prev.filter((x) => x.key !== key))
  }

  async function guardar() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      setError('Elige la fecha de la compra.')
      return
    }

    if (lineas.length === 0) {
      setError('Agrega al menos un producto.')
      return
    }

    let proveedor: ProveedorInput = null

    if (proveedorSel === NUEVO) {
      const nombre = nuevoNombre.trim()

      if (!nombre) {
        setError('Escribe el nombre del proveedor.')
        return
      }

      proveedor = { nombre }
    } else if (proveedorSel !== '') {
      proveedor = { id: proveedorSel }
    }

    setGuardando(true)
    setError(null)

    try {
      await savePurchase(
        db,
        {
          fecha,
          metodo_pago: metodo,
          folio: folio.trim() === '' ? null : folio.trim(),
          notas: notas.trim() === '' ? null : notas.trim(),
        },
        proveedor,
        lineas.map((l) => ({
          id: l.id,
          product_id: l.product_id,
          cantidad: l.cantidad,
          costo_unitario: l.costo_unitario,
        })),
        compra?.id,
      )

      void syncNow()
      navigate('/inventario/compras')
    } catch {
      setError('No se pudo guardar la compra.')
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!compra || eliminando) return

    setEliminando(true)
    setError(null)

    try {
      await deletePurchase(db, compra.id)
      void syncNow()
      navigate('/inventario/compras')
    } catch {
      setError('No se pudo eliminar la compra.')
      setEliminando(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-44 pt-5">
      {/* Encabezado */}
      <header>
        <Link
          to="/inventario/compras"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-violet-700"
        >
          <ChevronLeft className="size-4" />
          Regresar a compras
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-md shadow-violet-900/10">
            <ReceiptText className="size-5" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
              VENDORA
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {compra ? 'Editar compra' : 'Nueva compra'}
            </h1>
          </div>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Registra tus adquisiciones para mantener actualizado el inventario y
          los costos de tus productos.
        </p>
      </header>

      {/* Datos de compra */}
      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-200/30">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileText className="size-4" />
          </div>

          <h2 className="text-sm font-bold text-slate-800">
            Datos de la compra
          </h2>
        </div>

        <div className="space-y-4">
          <Campo
            id="fecha"
            label="Fecha de compra"
            type="date"
            value={fecha}
            onChange={setFecha}
            maxLength={10}
          />

          <div className="space-y-1.5">
            <Label
              htmlFor="proveedor"
              className="text-sm font-medium text-slate-700"
            >
              Proveedor
            </Label>

            <div className="relative">
              <Store className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <select
                id="proveedor"
                value={proveedorSel}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  setProveedorSel(e.target.value)
                  setError(null)
                }}
                className={`${selectClass} pl-10`}
              >
                <option value="">Sin proveedor</option>

                {proveedoresOrdenados.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}

                <option value={NUEVO}>+ Nuevo proveedor…</option>
              </select>
            </div>
          </div>

          {proveedorSel === NUEVO && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-3">
              <Campo
                id="nuevo-prov"
                label="Nombre del proveedor"
                value={nuevoNombre}
                onChange={setNuevoNombre}
                maxLength={80}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="metodo"
              className="text-sm font-medium text-slate-700"
            >
              Método de pago
            </Label>

            <div className="relative">
              <Wallet className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <select
                id="metodo"
                value={metodo}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setMetodo(
                    e.target.value as LocalPurchase['metodo_pago'],
                  )
                }
                className={`${selectClass} pl-10`}
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              id="folio"
              label="Folio o ticket"
              value={folio}
              onChange={setFolio}
              maxLength={60}
            />

            <Campo
              id="notas"
              label="Notas"
              value={notas}
              onChange={setNotas}
              maxLength={1000}
            />
          </div>
        </div>
      </section>

      {/* Productos */}
      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Productos
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {lineas.length} {lineas.length === 1 ? 'producto' : 'productos'} ·{' '}
              {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
            </p>
          </div>

          <Button
            size="sm"
            onClick={() => abrirLinea(null)}
            className="h-10 rounded-xl bg-violet-600 px-3 font-semibold text-white shadow-sm shadow-violet-900/10 hover:bg-violet-700"
          >
            <Plus className="mr-1.5 size-4" />
            Agregar
          </Button>
        </div>

        <div className="mt-3 space-y-2.5">
          {lineas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-9 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                <Package className="size-6" />
              </div>

              <p className="mt-3 text-sm font-bold text-slate-800">
                Aún no agregas productos
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Agrega los productos que forman parte de esta compra.
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={() => abrirLinea(null)}
                className="mt-4 h-10 rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <Plus className="mr-2 size-4" />
                Agregar producto
              </Button>
            </div>
          )}

          {lineas.map((l) => (
            <div
              key={l.key}
              className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm shadow-slate-200/20"
            >
              <button
                type="button"
                onClick={() => abrirLinea(l)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                  <Package className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {nombres.get(l.product_id) ?? 'Producto eliminado'}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {l.cantidad} × {formatMXN(l.costo_unitario)}
                  </p>
                </div>

                <ChevronRight className="size-4 shrink-0 text-slate-300" />
              </button>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-slate-900">
                  {formatMXN(totalLinea(l.cantidad, l.costo_unitario))}
                </p>
              </div>

              <button
                type="button"
                aria-label="Quitar producto"
                onClick={() => quitarLinea(l.key)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Eliminar compra */}
      {compra && (
        confirmando ? (
          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-bold text-rose-800">
                  ¿Eliminar esta compra?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-rose-700">
                  Esta acción eliminará el registro de la compra.
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
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
            className="mt-6 h-11 w-full rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => setConfirmando(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Eliminar compra
          </Button>
        )
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Barra inferior fija */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">
              Total de compra
            </p>
            <p className="truncate text-xl font-bold tabular-nums tracking-tight text-slate-900">
              {formatMXN(total)}
            </p>
          </div>

          <Button
            onClick={() => void guardar()}
            disabled={guardando || eliminando}
            className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-[#172554] via-[#202f69] to-[#6336a9] px-6 font-semibold text-white shadow-md shadow-violet-900/10 transition hover:brightness-110"
          >
            {guardando ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="mr-2 size-4" />
                Guardar compra
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Drawer de línea */}
      <Drawer open={lineaAbierta} onOpenChange={setLineaAbierta}>
        <DrawerContent className="max-h-[90dvh]">
          <LineaCompraForm
            key={lineaSel?.key ?? 'nueva'}
            productos={productos}
            stats={stats}
            linea={lineaSel}
            onSave={guardarLinea}
          />
        </DrawerContent>
      </Drawer>
    </div>
  )
}

export function PurchaseFormPage() {
  const { id } = useParams<{ id: string }>()
  const { db } = useSync()

  const datos = useLiveQuery(async () => {
    const proveedores = (await db.suppliers.toArray()).filter(
      (s) => s.deleted_at === null,
    )

    const productos = await db.products.toArray()

    if (!id) {
      return {
        compra: null,
        items: [] as LocalPurchaseItem[],
        proveedores,
        productos,
      }
    }

    const compra = (await db.purchases.get(id)) ?? null

    const items = compra
      ? (
          await db.purchase_items
            .where('purchase_id')
            .equals(id)
            .toArray()
        ).filter((i) => i.deleted_at === null)
      : []

    return { compra, items, proveedores, productos }
  }, [db, id])

  if (datos === undefined) {
    return (
      <div className="min-h-full bg-slate-50/70 p-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-5 h-48 animate-pulse rounded-2xl bg-white" />
        <div className="mt-4 h-32 animate-pulse rounded-2xl bg-white" />
      </div>
    )
  }

  if (id && (!datos.compra || datos.compra.deleted_at !== null)) {
    return <Navigate to="/inventario/compras" replace />
  }

  return (
    <PurchaseForm
      key={id ?? 'nueva'}
      compra={datos.compra}
      items={datos.items}
      proveedores={datos.proveedores}
      productos={datos.productos}
    />
  )
}

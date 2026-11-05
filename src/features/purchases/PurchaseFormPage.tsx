import { useState, type ChangeEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Campo } from '@/components/Campo'
import type { LocalProduct, LocalPurchase, LocalPurchaseItem, LocalSupplier } from '@/lib/db'
import { hoyLocal } from '@/lib/dates'
import { formatMXN, sumar, totalLinea } from '@/lib/money'
import { useSync } from '@/features/sync/useSync'
import { LineaCompraForm, type LineaEstado } from './LineaCompraForm'
import { METODOS_PAGO } from './metodos'
import { deletePurchase, savePurchase, type ProveedorInput } from './purchases.repo'
import { useProductStats } from './useProductStats'

const NUEVO = '__nuevo'

interface Props {
  compra: LocalPurchase | null
  items: LocalPurchaseItem[]
  proveedores: LocalSupplier[]
  productos: LocalProduct[]
}

function PurchaseForm({ compra, items, proveedores, productos }: Props) {
  const { db, syncNow } = useSync()
  const navigate = useNavigate()
  const stats = useProductStats()

  const [fecha, setFecha] = useState(compra?.fecha ?? hoyLocal())
  const [proveedorSel, setProveedorSel] = useState(compra?.supplier_id ?? '')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [metodo, setMetodo] = useState<LocalPurchase['metodo_pago']>(compra?.metodo_pago ?? 'efectivo')
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
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nombres = new Map(productos.map((p) => [p.id, p.nombre]))
  const total = sumar(lineas.map((l) => totalLinea(l.cantidad, l.costo_unitario)))
  const proveedoresOrdenados = [...proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  function abrirLinea(l: LineaEstado | null) {
    setLineaSel(l)
    setLineaAbierta(true)
  }

  function guardarLinea(l: LineaEstado) {
    setLineas((prev) => (prev.some((x) => x.key === l.key) ? prev.map((x) => (x.key === l.key ? l : x)) : [...prev, l]))
    setLineaAbierta(false)
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
    if (!compra) return
    await deletePurchase(db, compra.id)
    void syncNow()
    navigate('/inventario/compras')
  }

  return (
    <div className="px-4 pb-40 pt-4">
      <Link to="/inventario/compras" className="mb-2 inline-flex items-center text-sm text-neutral-500">
        <ChevronLeft className="size-4" /> Compras
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{compra ? 'Editar compra' : 'Nueva compra'}</h1>

      <div className="mt-5 space-y-4">
        <Campo id="fecha" label="Fecha" type="date" value={fecha} onChange={setFecha} maxLength={10} />

        <div className="space-y-1.5">
          <Label htmlFor="proveedor">Proveedor</Label>
          <select
            id="proveedor"
            value={proveedorSel}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setProveedorSel(e.target.value)}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
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
        {proveedorSel === NUEVO && (
          <Campo id="nuevo-prov" label="Nombre del proveedor" value={nuevoNombre} onChange={setNuevoNombre} maxLength={80} />
        )}

        <div className="space-y-1.5">
          <Label htmlFor="metodo">Método de pago</Label>
          <select
            id="metodo"
            value={metodo}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setMetodo(e.target.value as LocalPurchase['metodo_pago'])}
            className="h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
          >
            {METODOS_PAGO.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo id="folio" label="Folio o ticket (opcional)" value={folio} onChange={setFolio} maxLength={60} />
          <Campo id="notas" label="Notas (opcional)" value={notas} onChange={setNotas} maxLength={1000} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-medium">Productos</h2>
        <Button size="sm" onClick={() => abrirLinea(null)}>
          <Plus className="mr-1 size-4" />
          Agregar
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {lineas.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Aún no agregas productos.
          </div>
        )}
        {lineas.map((l) => (
          <div key={l.key} className="flex items-center gap-2 rounded-xl border border-neutral-200 pr-2">
            <button
              type="button"
              onClick={() => abrirLinea(l)}
              className="flex min-h-14 flex-1 flex-col justify-center px-4 py-2 text-left"
            >
              <span className="font-medium">{nombres.get(l.product_id) ?? 'Producto eliminado'}</span>
              <span className="text-xs text-neutral-500">
                {l.cantidad} × {formatMXN(l.costo_unitario)}
              </span>
            </button>
            <span className="font-medium">{formatMXN(totalLinea(l.cantidad, l.costo_unitario))}</span>
            <button
              type="button"
              aria-label="Quitar producto"
              onClick={() => setLineas((prev) => prev.filter((x) => x.key !== l.key))}
              className="flex size-10 items-center justify-center text-neutral-400"
            >
              <X className="size-5" />
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {compra &&
        (confirmando ? (
          <div className="mt-6 flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" className="h-11 flex-1" onClick={eliminar}>
              Sí, eliminar
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" className="mt-6 h-11 w-full text-red-600" onClick={() => setConfirmando(true)}>
            <Trash2 className="mr-2 size-4" />
            Eliminar compra
          </Button>
        ))}

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <p className="text-xs text-neutral-500">Total</p>
            <p className="font-semibold">{formatMXN(total)}</p>
          </div>
          <Button onClick={() => void guardar()} disabled={guardando} className="h-11 px-8">
            {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
            Guardar compra
          </Button>
        </div>
      </div>

      <Drawer open={lineaAbierta} onOpenChange={setLineaAbierta}>
        <DrawerContent>
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
    const proveedores = (await db.suppliers.toArray()).filter((s) => s.deleted_at === null)
    const productos = await db.products.toArray()
    if (!id) return { compra: null, items: [] as LocalPurchaseItem[], proveedores, productos }
    const compra = (await db.purchases.get(id)) ?? null
    const items = compra
      ? (await db.purchase_items.where('purchase_id').equals(id).toArray()).filter((i) => i.deleted_at === null)
      : []
    return { compra, items, proveedores, productos }
  }, [db, id])

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />
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
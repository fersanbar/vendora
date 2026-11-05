import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { LocalListing } from "@/lib/db";
import { ListingForm } from "@/features/listings/ListingForm";
import { useSync } from "@/features/sync/useSync";
import { ProductForm } from "./ProductForm";
import { useIvaGeneral } from "@/features/taxes/useIvaGeneral";
import { useProductStats } from "@/features/purchases/useProductStats";
import { calcularMargen, calcularNetoConImpuestos, formatMXN } from '@/lib/money'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { db } = useSync();
  const ivaGeneral = useIvaGeneral();
  const stats = useProductStats();
  const [editando, setEditando] = useState(false);
  const [listingAbierto, setListingAbierto] = useState(false);
  const [listingSel, setListingSel] = useState<LocalListing | null>(null);

  const datos = useLiveQuery(async () => {
    if (!id) return null;
    const producto = (await db.products.get(id)) ?? null;
    const listings = (
      await db.listings.where("product_id").equals(id).toArray()
    ).filter((l) => l.deleted_at === null);
    const ids = listings.map((l) => l.id);
    const impuestos = ids.length
      ? (
          await db.listing_taxes.where("listing_id").anyOf(ids).toArray()
        ).filter((i) => i.deleted_at === null)
      : [];
    const canales = await db.channels.toArray();
    const tipos = (await db.tax_types.toArray()).filter(
      (t) => t.deleted_at === null,
    );
    return { producto, listings, impuestos, canales, tipos };
  }, [db, id]);

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />;
  }
  if (!datos || !datos.producto || datos.producto.deleted_at !== null) {
    return <Navigate to="/inventario" replace />;
  }

  const { producto, listings, impuestos, canales, tipos } = datos;
  const s = stats?.get(producto.id);
  const costoProm = s?.costoPromedio ?? null;
  const ultimoCosto = s?.ultimoCosto ?? null;
  const nombreCanal = new Map(canales.map((c) => [c.id, c.nombre]));
  const claveTipo = new Map(tipos.map((t) => [t.id, t.clave]))
  const usados = new Set(listings.map((l) => l.channel_id));
  const opciones = canales.filter((c) => c.activo && !usados.has(c.id));

  const impuestosSel = listingSel
    ? impuestos.filter((i) => i.listing_id === listingSel.id)
    : [];
  const tiposForm = tipos.filter(
    (t) => t.activo || impuestosSel.some((i) => i.tax_type_id === t.id),
  );

  function abrirListing(l: LocalListing | null) {
    setListingSel(l);
    setListingAbierto(true);
  }

  return (
    <div className="px-4 pb-6 pt-4">
      <Link
        to="/inventario"
        className="mb-2 inline-flex items-center text-sm text-neutral-500"
      >
        <ChevronLeft className="size-4" /> Inventario
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {producto.nombre}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {[producto.sku, producto.categoria].filter(Boolean).join(" · ") ||
              "Sin SKU ni categoría"}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setEditando(true)}
          aria-label="Editar producto"
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          ["Existencias", String(s?.stock ?? 0)],
          ["Costo promedio", costoProm !== null ? formatMXN(costoProm) : "—"],
          ["Último costo", ultimoCosto !== null ? formatMXN(ultimoCosto) : "—"],
        ].map(([etiqueta, valor]) => (
          <div
            key={etiqueta}
            className="rounded-xl border border-neutral-200 p-3"
          >
            <p className="text-xs text-neutral-500">{etiqueta}</p>
            <p className="mt-1 text-sm font-semibold">{valor}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-medium">Publicaciones</h2>
        <Button
          size="sm"
          disabled={opciones.length === 0}
          onClick={() => abrirListing(null)}
        >
          <Plus className="mr-1 size-4" />
          Agregar a un canal
        </Button>
      </div>

      {canales.length === 0 && (
        <p className="mt-3 text-sm text-neutral-500">
          Aún no hay canales en tu teléfono. Conéctate a internet una vez, o
          agrégalos en Más → Canales de venta.
        </p>
      )}
      {canales.length > 0 && opciones.length === 0 && (
        <p className="mt-3 text-sm text-neutral-500">
          Este producto ya está en todos tus canales activos.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {listings.length === 0 && canales.length > 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
            Aún no está publicado en ningún canal.
          </div>
        )}

                {listings.map((l) => {
          const delListing = impuestos.filter((i) => i.listing_id === l.id)
          const aplicaIva = delListing.some((i) => claveTipo.get(i.tax_type_id) === 'iva')
          const { neto } = calcularNetoConImpuestos(
            l.precio_venta,
            l.comision_pct,
            l.cargo_fijo,
            l.costo_envio,
            ivaGeneral,
            aplicaIva,
            delListing.map((i) => i.tasa_pct),
          )
          const resultado = costoProm !== null ? calcularMargen(l.precio_venta, neto, costoProm) : null
          return (
            <button
              key={l.id}
              onClick={() => abrirListing(l)}
              className="flex w-full items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 text-left"
            >
              <div>
                <p className="font-medium">{nombreCanal.get(l.channel_id) ?? 'Canal'}</p>
                <p className="text-xs text-neutral-500">
                  Precio {formatMXN(l.precio_venta)} · libera en {l.dias_liberacion} días
                </p>
              </div>
              <div className="text-right">
                <p className={`font-medium ${neto < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatMXN(neto)}
                </p>
                <p className="text-xs text-neutral-500">neto</p>
                {resultado?.roiPct != null && (
                  <p className="text-xs text-neutral-500">ROI {resultado.roiPct}%</p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <Drawer open={editando} onOpenChange={setEditando}>
        <DrawerContent>
          <ProductForm
            key={producto.id}
            producto={producto}
            onDone={() => setEditando(false)}
          />
        </DrawerContent>
      </Drawer>

      <Drawer open={listingAbierto} onOpenChange={setListingAbierto}>
        <DrawerContent>
          <ListingForm
            key={listingSel?.id ?? "nueva"}
            productId={producto.id}
            listing={listingSel}
            opciones={opciones}
            canalNombre={
              listingSel
                ? (nombreCanal.get(listingSel.channel_id) ?? null)
                : null
            }
            tiposImpuesto={tiposForm}
            impuestosActuales={impuestosSel}
            onDone={() => setListingAbierto(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  );
}

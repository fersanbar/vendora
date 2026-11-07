import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/Campo";
import type {
  LocalListing,
  LocalListingTax,
  LocalProduct,
  LocalTaxType,
} from "@/lib/db";
import {
  formatMXN,
  parseCantidad,
  parseCosto,
  parseMonto,
  totalLinea,
} from "@/lib/money";
import type { ProductoStats } from "@/features/purchases/useProductStats";
import { contextoPublicacion, sugerirLinea } from "./sugerencia";
import { resolverCosto } from "@/features/purchases/costo";

export interface LineaVentaEstado {
  key: string;
  id?: string;
  product_id: string;
  cantidad: number;
  precio_unitario: number;
  comision: number;
  cargo_fijo: number;
  costo_unitario: number | null;
  // Sugerencias de la publicación para los campos del pedido (no se guardan por línea)
  impuestoSugerido: number;
  envioReferencia: number;
  diasLiberacion: number;
}

type Campos = "precio" | "comision" | "fijo" | "costo";

interface Props {
  productos: LocalProduct[];
  stats: Map<string, ProductoStats> | undefined;
  canalId: string;
  listings: LocalListing[];
  listingTaxes: LocalListingTax[];
  tipos: LocalTaxType[];
  ivaGeneral: number;
  linea: LineaVentaEstado | null;
  onSave: (linea: LineaVentaEstado) => void;
}

export function LineaVentaForm({
  productos,
  stats,
  canalId,
  listings,
  listingTaxes,
  tipos,
  ivaGeneral,
  linea,
  onSave,
}: Props) {
  const [productoId, setProductoId] = useState(linea?.product_id ?? "");
  const [busqueda, setBusqueda] = useState("");
  const [cantidad, setCantidad] = useState(
    linea ? String(linea.cantidad) : "1",
  );
  const [ov, setOv] = useState<Partial<Record<Campos, string>>>(() =>
    linea
      ? {
          precio: String(linea.precio_unitario),
          comision: String(linea.comision),
          fijo: String(linea.cargo_fijo),
          costo:
            linea.costo_unitario === null ? "" : String(linea.costo_unitario),
        }
      : {},
  );
  const [error, setError] = useState<string | null>(null);

  function poner(campo: Campos, valor: string) {
    setOv((prev) => ({ ...prev, [campo]: valor }));
  }

  const producto = productos.find((p) => p.id === productoId);
  const { listing, impuestos, aplicaIva } = contextoPublicacion(
    productoId,
    canalId,
    listings,
    listingTaxes,
    tipos,
  );

  const cantidadN = parseCantidad(cantidad);
  const precioTxt = ov.precio ?? (listing ? String(listing.precio_venta) : "");
  const precioN = parseMonto(precioTxt);

  const sugerencia = sugerirLinea({
    listing,
    impuestos,
    aplicaIva,
    ivaGeneral,
    cantidad: cantidadN ?? 0,
    precioUnitario: precioN ?? 0,
  });

  const comisionTxt =
    ov.comision ?? (listing ? String(sugerencia.comision) : "");
  const fijoTxt = ov.fijo ?? (listing ? String(sugerencia.cargo_fijo) : "");
  const costoSugerido = productoId
    ? resolverCosto(
        stats?.get(productoId)?.costoPromedio,
        producto?.costo_referencia,
      ).valor
    : null;
  const costoTxt =
    ov.costo ?? (costoSugerido !== null ? String(costoSugerido) : "");

  const comisionN = parseMonto(comisionTxt);
  const fijoN = parseMonto(fijoTxt);
  const costoN = costoTxt.trim() === "" ? null : parseCosto(costoTxt);
  const costoInvalido = costoTxt.trim() !== "" && costoN === null;

  const activos = productos.filter((p) => p.deleted_at === null);
  const q = busqueda.trim().toLowerCase();
  const resultados = activos
    .filter(
      (p) =>
        q === "" ||
        [p.nombre, p.sku, p.codigo_barras].some((v) =>
          v?.toLowerCase().includes(q),
        ),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, 20);

  function guardar() {
    if (!productoId) return setError("Elige un producto.");
    if (cantidadN === null)
      return setError("La cantidad debe ser un entero mayor a 0.");
    if (precioN === null || comisionN === null || fijoN === null) {
      return setError("Revisa los montos: máximo 2 decimales.");
    }
    if (costoInvalido) return setError("Revisa el costo: máximo 4 decimales.");

    onSave({
      key: linea?.key ?? crypto.randomUUID(),
      id: linea?.id,
      product_id: productoId,
      cantidad: cantidadN,
      precio_unitario: precioN,
      comision: comisionN,
      cargo_fijo: fijoN,
      costo_unitario: costoN,
      impuestoSugerido: sugerencia.impuestos,
      envioReferencia: sugerencia.envio,
      diasLiberacion: sugerencia.dias,
    });
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="text-left">
        <DrawerTitle>
          {linea ? "Editar producto" : "Agregar producto"}
        </DrawerTitle>
        <DrawerDescription>
          Comisión y cargo fijo son de este producto. El envío y los impuestos
          se capturan en el pedido.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-4 px-4 pb-6">
        {!producto ? (
          <div className="space-y-2">
            <Input
              value={busqueda}
              placeholder="Buscar por nombre, SKU o código"
              className="h-11"
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {activos.length === 0 && (
              <p className="text-sm text-neutral-500">
                Aún no tienes productos. Créalos primero en Inventario.
              </p>
            )}
            {resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProductoId(p.id);
                  setOv({});
                }}
                className="flex min-h-12 w-full flex-col justify-center rounded-xl border border-neutral-200 px-4 py-2 text-left"
              >
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-neutral-500">
                  {p.sku ?? "Sin SKU"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
              <span className="font-medium">{producto.nombre}</span>
              <button
                type="button"
                className="text-sm text-neutral-500 underline"
                onClick={() => {
                  setProductoId("");
                  setOv({});
                }}
              >
                Cambiar
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Existencias: {stats?.get(productoId)?.stock ?? 0}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Campo
                id="cantidad"
                label="Cantidad"
                value={cantidad}
                onChange={setCantidad}
                maxLength={6}
                inputMode="numeric"
              />
              <Campo
                id="precio"
                label="Precio por pieza (MXN)"
                value={precioTxt}
                onChange={(v) => poner("precio", v)}
                maxLength={13}
                inputMode="decimal"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">
                  Cargo por venta de este producto
                </p>
                {listing && (
                  <button
                    type="button"
                    className="text-xs text-neutral-500 underline"
                    onClick={() => setOv({})}
                  >
                    Restablecer cálculo
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {listing
                  ? "Se calcula con la publicación. Corrígelo con lo que realmente te cobró el canal."
                  : "Este producto no está publicado en este canal. Captura los montos reales."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="comision"
                  label="Comisión"
                  value={comisionTxt}
                  onChange={(v) => poner("comision", v)}
                  maxLength={13}
                  inputMode="decimal"
                />
                <Campo
                  id="fijo"
                  label="Cargo fijo"
                  value={fijoTxt}
                  onChange={(v) => poner("fijo", v)}
                  maxLength={13}
                  inputMode="decimal"
                />
              </div>
            </div>

            <Campo
              id="costo"
              label="Costo por pieza (MXN)"
              value={costoTxt}
              onChange={(v) => poner("costo", v)}
              maxLength={13}
              inputMode="decimal"
              placeholder="Sin compras registradas"
            />

            {cantidadN !== null && precioN !== null && (
              <p className="text-sm font-medium">
                Ingreso de este producto:{" "}
                {formatMXN(totalLinea(cantidadN, precioN))}
              </p>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <Button type="button" onClick={guardar} className="h-11 w-full">
              {linea ? "Guardar cambios" : "Agregar al pedido"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

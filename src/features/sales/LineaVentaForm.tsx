
import { useState } from "react";
import {
  Check,
  ChevronRight,
  Package,
  Search,
  ShoppingBag,
  RotateCcw,
  Wallet,
} from "lucide-react";
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
    setError(null);
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

    if (cantidadN === null) {
      return setError("La cantidad debe ser un entero mayor a 0.");
    }

    if (precioN === null || comisionN === null || fijoN === null) {
      return setError("Revisa los montos: máximo 2 decimales.");
    }

    if (costoInvalido) {
      return setError("Revisa el costo: máximo 4 decimales.");
    }

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
    <div className="max-h-[85dvh] overflow-y-auto bg-slate-50/70">
      <DrawerHeader className="border-b border-slate-100 bg-white px-5 pb-5 pt-6 text-left">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-sm">
            <ShoppingBag size={18} />
          </div>
          <span className="text-xs font-bold tracking-[0.18em] text-slate-500">
            VENDORA
          </span>
        </div>

        <DrawerTitle className="text-xl font-bold tracking-tight text-slate-900">
          {linea ? "Editar producto" : "Agregar producto"}
        </DrawerTitle>

        <DrawerDescription className="mt-1 text-sm leading-relaxed text-slate-500">
          Comisión y cargo fijo corresponden a este producto. El envío y los
          impuestos se capturan en el pedido.
        </DrawerDescription>
      </DrawerHeader>

      <div className="space-y-5 px-4 pb-7 pt-5">
        {!producto ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="buscar-producto-venta"
                className="text-sm font-semibold text-slate-700"
              >
                Buscar producto
              </label>

              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  id="buscar-producto-venta"
                  value={busqueda}
                  placeholder="Nombre, SKU o código de barras"
                  className="h-12 rounded-xl border-slate-200 bg-white pl-10 shadow-sm focus-visible:ring-[#7c3aed]"
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            {activos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Package size={22} />
                </div>
                <p className="font-semibold text-slate-800">
                  No tienes productos todavía
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Primero crea tus productos desde la sección Inventario.
                </p>
              </div>
            ) : resultados.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No encontramos coincidencias
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Prueba con otro nombre, SKU o código.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Productos disponibles ({resultados.length})
                </p>

                {resultados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProductoId(p.id);
                      setOv({});
                      setError(null);
                    }}
                    className="group flex min-h-[68px] w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-violet-50 group-hover:text-violet-700">
                      <Package size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {p.nombre}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {p.sku ?? "Sin SKU"}
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                  <Package size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Producto seleccionado
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
                    {producto.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Existencias: {stats?.get(productoId)?.stock ?? 0}
                  </p>
                </div>

                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                  onClick={() => {
                    setProductoId("");
                    setOv({});
                    setError(null);
                  }}
                >
                  Cambiar
                </button>
              </div>
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Información de venta
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Define la cantidad y el precio de venta por pieza.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="cantidad"
                  label="Cantidad"
                  value={cantidad}
                  onChange={(v) => {
                    setCantidad(v);
                    setError(null);
                  }}
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
            </section>

            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Cargos del canal
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Por producto
                    </p>
                  </div>
                </div>

                {listing && (
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                    onClick={() => {
                      setOv({});
                      setError(null);
                    }}
                  >
                    <RotateCcw size={13} />
                    Restablecer
                  </button>
                )}
              </div>

              <p className="text-xs leading-relaxed text-slate-500">
                {listing
                  ? "Los importes se sugieren con base en tu publicación. Puedes corregirlos según el cobro real del canal."
                  : "Este producto no está publicado en este canal. Captura los cargos reales de la venta."}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Campo
                  id="comision"
                  label="Comisión (MXN)"
                  value={comisionTxt}
                  onChange={(v) => poner("comision", v)}
                  maxLength={13}
                  inputMode="decimal"
                />

                <Campo
                  id="fijo"
                  label="Cargo fijo (MXN)"
                  value={fijoTxt}
                  onChange={(v) => poner("fijo", v)}
                  maxLength={13}
                  inputMode="decimal"
                />
              </div>
            </section>

            <section className="space-y-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Costo de mercancía
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Se utiliza para calcular la rentabilidad de este producto.
                </p>
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

              {costoSugerido !== null && ov.costo === undefined && (
                <p className="text-xs text-slate-500">
                  Costo sugerido según tu inventario.
                </p>
              )}
            </section>

            {cantidadN !== null && precioN !== null && (
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#172554] via-[#202f69] to-[#6336a9] p-4 text-white shadow-md">
                <p className="text-xs font-medium text-white/70">
                  Ingreso de este producto
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {formatMXN(totalLinea(cantidadN, precioN))}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-xs text-white/70">
                  <span>
                    {cantidadN} {cantidadN === 1 ? "pieza" : "piezas"}
                  </span>
                  <span>{formatMXN(precioN)} por pieza</span>
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-medium text-rose-700"
              >
                {error}
              </div>
            )}

            <Button
              type="button"
              onClick={guardar}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-[#172554] to-[#6336a9] font-semibold shadow-md shadow-indigo-950/10 transition hover:opacity-95"
            >
              <Check size={17} className="mr-2" />
              {linea ? "Guardar cambios" : "Agregar al pedido"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

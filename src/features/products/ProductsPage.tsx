import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { PackagePlus, Plus, Search, ArrowDownAZ } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { SyncStatus } from "@/features/sync/SyncStatus";
import { useSync } from "@/features/sync/useSync";
import { ProductForm } from "./ProductForm";
import { formatMXN } from "@/lib/money";
import { InventarioTabs } from "@/features/purchases/InventarioTabs";
import { useProductStats } from "@/features/purchases/useProductStats";
import { resolverCosto } from "@/features/purchases/costo";

export function ProductsPage() {
  const { db } = useSync();
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<"asc" | "desc">("asc");
  const [abierto, setAbierto] = useState(false);
  const stats = useProductStats();

  const productos = useLiveQuery(
    async () =>
      (await db.products.toArray()).filter((p) => p.deleted_at === null),
    [db],
  );

  const q = busqueda.trim().toLowerCase();

  const visibles = (productos ?? [])
    .filter(
      (p) =>
        q === "" ||
        [p.nombre, p.sku, p.codigo_barras, p.categoria].some((v) =>
          v?.toLowerCase().includes(q),
        ),
    )
    .sort((a, b) =>
      orden === "asc"
        ? a.nombre.localeCompare(b.nombre, "es")
        : b.nombre.localeCompare(a.nombre, "es"),
    );

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
        <SyncStatus />
      </div>

      <InventarioTabs />

      <div className="mt-5 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-neutral-400" />
          <Input
            value={busqueda}
            placeholder="Buscar producto..."
            className="h-11 rounded-xl border-neutral-200 bg-white pl-9"
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setBusqueda(e.target.value)
            }
          />
        </div>

        <button
          type="button"
          onClick={() => setOrden((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="flex h-11 shrink-0 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          aria-label={orden === "asc" ? "Ordenar Z-A" : "Ordenar A-Z"}
        >
          <ArrowDownAZ className="size-4" />
          {orden === "asc" ? "A-Z" : "Z-A"}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-neutral-500">
          {productos === undefined
            ? "Cargando productos..."
            : `${visibles.length} ${visibles.length === 1 ? "producto" : "productos"}`}
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {productos === undefined &&
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-neutral-100"
            />
          ))}

        {productos && productos.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <PackagePlus className="mx-auto size-8 text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-500">
              Aún no tienes productos.
            </p>
            <Button className="mt-4" onClick={() => setAbierto(true)}>
              Agregar el primero
            </Button>
          </div>
        )}

        {productos && productos.length > 0 && visibles.length === 0 && (
          <div className="py-10 text-center">
            <Search className="mx-auto size-7 text-neutral-300" />
            <p className="mt-3 text-sm text-neutral-500">
              Sin resultados para "{busqueda}".
            </p>
            <button
              onClick={() => setBusqueda("")}
              className="mt-2 text-sm font-medium text-neutral-900 underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}

        {visibles.map((p) => {
          const s = stats?.get(p.id);
          const costo = resolverCosto(s?.costoPromedio, p.costo_referencia);
          return (
            <Link
              key={p.id}
              to={`/inventario/${p.id}`}
              className="flex min-h-16 w-full flex-col justify-center rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-colors hover:bg-neutral-50"
            >
              <span className="font-medium text-neutral-900">{p.nombre}</span>

              <span className="mt-0.5 text-xs text-neutral-500">
                {[p.sku, p.categoria].filter(Boolean).join(" · ") ||
                  "Sin SKU ni categoría"}
              </span>

              <span className="text-xs text-neutral-500">
                {costo.valor === null
                  ? `Stock ${s?.stock ?? 0} · sin costo`
                  : `Stock ${s?.stock ?? 0} · ${costo.origen === "compras" ? "costo prom." : "costo ref."} ${formatMXN(costo.valor)}`}
              </span>
            </Link>
          );
        })}
      </div>

      <Button
        onClick={() => setAbierto(true)}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 size-14 rounded-full shadow-lg"
        aria-label="Agregar producto"
      >
        <Plus className="size-6" />
      </Button>

      <Drawer open={abierto} onOpenChange={setAbierto}>
        <DrawerContent>
          <ProductForm
            key="nuevo"
            producto={null}
            onDone={() => setAbierto(false)}
          />
        </DrawerContent>
      </Drawer>
    </div>
  );
}

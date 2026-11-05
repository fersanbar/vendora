import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatearFecha, hoyLocal } from "@/lib/dates";
import { formatMXN, sumar, totalLinea } from "@/lib/money";
import { SyncStatus } from "@/features/sync/SyncStatus";
import { useSync } from "@/features/sync/useSync";
import { InventarioTabs } from "./InventarioTabs";
import { etiquetaMetodo } from "./metodos";

export function PurchasesPage() {
  const { db } = useSync();
  const navigate = useNavigate();

  const filas = useLiveQuery(async () => {
    const proveedores = new Map(
      (await db.suppliers.toArray()).map((s) => [s.id, s.nombre]),
    );
    const compras = (await db.purchases.toArray())
      .filter((c) => c.deleted_at === null)
      .sort(
        (a, b) =>
          b.fecha.localeCompare(a.fecha) ||
          b.created_at.localeCompare(a.created_at),
      );
    const items = (await db.purchase_items.toArray()).filter(
      (i) => i.deleted_at === null,
    );

    const porCompra = new Map<string, { piezas: number; montos: number[] }>();
    for (const i of items) {
      const acc = porCompra.get(i.purchase_id) ?? { piezas: 0, montos: [] };
      acc.piezas += i.cantidad;
      acc.montos.push(totalLinea(i.cantidad, i.costo_unitario));
      porCompra.set(i.purchase_id, acc);
    }

    return compras.map((c) => {
      const acc = porCompra.get(c.id);
      return {
        compra: c,
        proveedor: c.supplier_id
          ? (proveedores.get(c.supplier_id) ?? null)
          : null,
        piezas: acc?.piezas ?? 0,
        total: sumar(acc?.montos ?? []),
      };
    });
  }, [db]);

  const mes = hoyLocal().slice(0, 7);
  const totalMes = sumar(
    (filas ?? [])
      .filter((f) => f.compra.fecha.startsWith(mes))
      .map((f) => f.total),
  );

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
        <SyncStatus />
      </div>

      <InventarioTabs />

      <div className="mt-4 rounded-xl border border-neutral-200 p-4">
        <p className="text-xs text-neutral-500">Comprado este mes</p>
        <p className="mt-1 text-lg font-semibold">{formatMXN(totalMes)}</p>
      </div>

      <div className="mt-4 space-y-2">
        {filas === undefined &&
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-neutral-100"
            />
          ))}

        {filas && filas.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
            <ShoppingBasket className="mx-auto size-8 text-neutral-400" />
            <p className="mt-3 text-sm text-neutral-500">
              Aún no has registrado compras.
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate("/inventario/compras/nueva")}
            >
              Registrar la primera
            </Button>
          </div>
        )}

        {filas?.map((f) => (
          <Link
            key={f.compra.id}
            to={`/inventario/compras/${f.compra.id}`}
            className="flex min-h-16 items-center justify-between rounded-xl border border-neutral-200 px-4 py-2"
          >
            <div>
              <p className="font-medium">{f.proveedor ?? "Sin proveedor"}</p>
              <p className="text-xs text-neutral-500">
                {formatearFecha(f.compra.fecha)} ·{" "}
                {etiquetaMetodo(f.compra.metodo_pago)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatMXN(f.total)}</p>
              <p className="text-xs text-neutral-500">{f.piezas} piezas</p>
            </div>
          </Link>
        ))}
      </div>

      <Button
        onClick={() => navigate("/inventario/compras/nueva")}
        className="fixed right-4 z-20 size-14 rounded-full shadow-lg bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
        aria-label="Registrar compra"
      >
        <Plus className="size-6" />
      </Button>
    </div>
  );
}

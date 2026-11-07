import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeftRight, ChevronRight, Megaphone, TrendingUp, Wallet } from "lucide-react";
import { NavegadorMes } from "@/components/NavegadorMes";
import { periodoActual } from "@/lib/dates";
import { calcularResumen } from "@/lib/finanzas";
import { formatMXN } from "@/lib/money";
import { SyncStatus } from "@/features/sync/SyncStatus";
import { useSync } from "@/features/sync/useSync";
import { agruparLineas } from "@/features/sales/pedidos";

function Linea({
  etiqueta,
  valor,
  clase = "",
}: {
  etiqueta: string;
  valor: string;
  clase?: string;
}) {
  return (
    <div className={`flex justify-between ${clase}`}>
      <span className="text-neutral-500">{etiqueta}</span>
      <span>{valor}</span>
    </div>
  );
}

export function FinanzasPage() {
  const { db } = useSync();
  const [periodo, setPeriodo] = useState(periodoActual());

  const datos = useLiveQuery(async () => {
    const ventas = (await db.sales.toArray()).filter(
      (v) => v.deleted_at === null,
    );
    const items = (await db.sale_items.toArray()).filter(
      (i) => i.deleted_at === null,
    );
    const gastos = (await db.expenses.toArray()).filter(
      (g) => g.deleted_at === null,
    );
    const anuncios = (await db.ad_spends.toArray()).filter(
      (a) => a.deleted_at === null,
    );
    return { ventas, items, gastos, anuncios };
  }, [db]);

  if (datos === undefined) {
    return <div className="m-4 h-24 animate-pulse rounded-xl bg-neutral-100" />;
  }

  const ventasMes = datos.ventas.filter((v) => v.fecha.startsWith(periodo));
  const gastosMes = datos.gastos.filter((g) => g.fecha.startsWith(periodo));
  const anunciosMes = datos.anuncios.filter((a) => a.fecha.startsWith(periodo));

  const lineas = agruparLineas(datos.items);
  const r = calcularResumen({
    pedidos: ventasMes.map((v) => ({
      lineas: lineas.get(v.id) ?? [],
      costo_envio: v.costo_envio,
      impuestos: v.impuestos,
    })),
    gastos: gastosMes.map((g) => g.monto),
    publicidad: anunciosMes.map((a) => a.monto),
  });

  const colorNeta = r.utilidadNeta < 0 ? "text-red-600" : "text-emerald-600";

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="flex items-start justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Finanzas</h1>
        <SyncStatus />
      </div>

      <div className="mt-4">
        <NavegadorMes periodo={periodo} onChange={setPeriodo} />
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 p-4">
        <p className="text-xs text-neutral-500">Utilidad neta del mes</p>
        <p className={`mt-1 text-2xl font-semibold ${colorNeta}`}>
          {formatMXN(r.utilidadNeta)}
        </p>
      </div>

      <div className="mt-3 space-y-2 rounded-xl bg-neutral-50 p-4 text-sm">
        <Linea etiqueta="Ingresos por ventas" valor={formatMXN(r.ingresos)} />
        <Linea
          etiqueta="Utilidad de las ventas"
          valor={formatMXN(r.utilidadVentas)}
        />
        <Linea etiqueta="Gastos" valor={`−${formatMXN(r.gastos)}`} />
        <Linea etiqueta="Publicidad" valor={`−${formatMXN(r.publicidad)}`} />
        <div className="flex justify-between border-t border-neutral-200 pt-2 font-medium">
          <span>Utilidad neta</span>
          <span className={colorNeta}>{formatMXN(r.utilidadNeta)}</span>
        </div>
        {r.ventasSinCosto > 0 && (
          <p className="text-xs text-neutral-500">
            {r.ventasSinCosto}{" "}
            {r.ventasSinCosto === 1
              ? "venta sin costo no entra"
              : "ventas sin costo no entran"}{" "}
            a la utilidad.
          </p>
        )}
        <p className="text-xs text-neutral-500">
          La utilidad no es dinero disponible: no incluye lo pendiente de
          liberar ni las compras de mercancía.
        </p>
      </div>

      <div className="mt-6 space-y-2">
        <Link
          to="/finanzas/gastos"
          className="flex h-16 items-center justify-between rounded-xl border border-neutral-200 px-4"
        >
          <span className="flex items-center gap-3">
            <Wallet className="size-5" />
            <span>
              <span className="block font-medium">Gastos</span>
              <span className="block text-xs text-neutral-500">
                {formatMXN(r.gastos)} este mes
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>
        <Link
          to="/finanzas/publicidad"
          className="flex h-16 items-center justify-between rounded-xl border border-neutral-200 px-4"
        >
          <span className="flex items-center gap-3">
            <Megaphone className="size-5" />
            <span>
              <span className="block font-medium">Publicidad</span>
              <span className="block text-xs text-neutral-500">
                {formatMXN(r.publicidad)} este mes
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>
        <Link
          to="/finanzas/flujo"
          className="flex h-16 items-center justify-between rounded-xl border border-neutral-200 px-4"
        >
          <span className="flex items-center gap-3">
            <ArrowLeftRight className="size-5" />
            <span>
              <span className="block font-medium">Flujo de efectivo</span>
              <span className="block text-xs text-neutral-500">
                Lo que entra y sale de verdad
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>
        <Link
          to="/finanzas/rentabilidad"
          className="flex h-16 items-center justify-between rounded-xl border border-neutral-200 px-4"
        >
          <span className="flex items-center gap-3">
            <TrendingUp className="size-5" />
            <span>
              <span className="block font-medium">Rentabilidad</span>
              <span className="block text-xs text-neutral-500">
                Por producto y por canal
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>
      </div>
    </div>
  );
}

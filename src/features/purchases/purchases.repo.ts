import type {
  LocalPurchase,
  LocalPurchaseItem,
  LocalSupplier,
  VendoraDB,
} from "@/lib/db";

export interface PurchaseInput {
  fecha: string;
  metodo_pago: LocalPurchase["metodo_pago"];
  folio: string | null;
  notas: string | null;
}

export interface PurchaseLineInput {
  id?: string;
  product_id: string;
  cantidad: number;
  costo_unitario: number;
}

export type ProveedorInput = { id: string } | { nombre: string } | null;

// Solo columnas escribibles: user_id y updated_at los pone el servidor
function proveedorPayload(s: LocalSupplier) {
  return {
    id: s.id,
    nombre: s.nombre,
    activo: s.activo,
    deleted_at: s.deleted_at,
    created_at: s.created_at,
  };
}

function compraPayload(p: LocalPurchase) {
  return {
    id: p.id,
    supplier_id: p.supplier_id,
    fecha: p.fecha,
    metodo_pago: p.metodo_pago,
    folio: p.folio,
    notas: p.notas,
    deleted_at: p.deleted_at,
    created_at: p.created_at,
  };
}

function lineaPayload(i: LocalPurchaseItem) {
  return {
    id: i.id,
    purchase_id: i.purchase_id,
    product_id: i.product_id,
    cantidad: i.cantidad,
    costo_unitario: i.costo_unitario,
    deleted_at: i.deleted_at,
    created_at: i.created_at,
  };
}

export async function savePurchase(
  db: VendoraDB,
  input: PurchaseInput,
  proveedor: ProveedorInput,
  lineas: PurchaseLineInput[],
  id?: string,
): Promise<void> {
  if (lineas.length === 0) throw new Error("SIN_PRODUCTOS");
  const ahora = new Date().toISOString();

  await db.transaction(
    "rw",
    db.suppliers,
    db.purchases,
    db.purchase_items,
    db.outbox,
    async () => {
      // Proveedor: existente, o crearlo (reutiliza uno con el mismo nombre)
      let supplierId: string | null = null;
      if (proveedor) {
        if ("id" in proveedor) {
          supplierId = proveedor.id;
        } else if ("nombre" in proveedor) {
          const nombre = proveedor.nombre.trim();

          const existente = await db.suppliers
            .filter(
              (s) =>
                s.deleted_at === null &&
                s.nombre.toLowerCase() === nombre.toLowerCase(),
            )
            .first();

          if (existente) {
            supplierId = existente.id;
          } else {
            const nuevo: LocalSupplier = {
              id: crypto.randomUUID(),
              nombre,
              activo: true,
              deleted_at: null,
              created_at: ahora,
              updated_at: ahora,
            };

            await db.suppliers.put(nuevo);

            await db.outbox.add({
              table: "suppliers",
              rowId: nuevo.id,
              payload: proveedorPayload(nuevo),
              createdAt: ahora,
            });

            supplierId = nuevo.id;
          }
        }
      }

      const existente = id ? await db.purchases.get(id) : undefined;
      const fila: LocalPurchase = existente
        ? { ...existente, ...input, supplier_id: supplierId, updated_at: ahora }
        : {
            id: crypto.randomUUID(),
            ...input,
            supplier_id: supplierId,
            deleted_at: null,
            created_at: ahora,
            updated_at: ahora,
          };
      await db.purchases.put(fila);
      await db.outbox.add({
        table: "purchases",
        rowId: fila.id,
        payload: compraPayload(fila),
        createdAt: ahora,
      });

      // Líneas: actualizar las que cambiaron, crear las nuevas, quitar las eliminadas
      const previas = await db.purchase_items
        .where("purchase_id")
        .equals(fila.id)
        .toArray();
      const porId = new Map(previas.map((i) => [i.id, i]));
      const conservadas = new Set<string>();

      for (const l of lineas) {
        const previa = l.id ? porId.get(l.id) : undefined;
        if (previa) {
          conservadas.add(previa.id);
          if (
            previa.deleted_at === null &&
            previa.product_id === l.product_id &&
            previa.cantidad === l.cantidad &&
            previa.costo_unitario === l.costo_unitario
          ) {
            continue;
          }
          const actualizada: LocalPurchaseItem = {
            ...previa,
            product_id: l.product_id,
            cantidad: l.cantidad,
            costo_unitario: l.costo_unitario,
            deleted_at: null,
            updated_at: ahora,
          };
          await db.purchase_items.put(actualizada);
          await db.outbox.add({
            table: "purchase_items",
            rowId: actualizada.id,
            payload: lineaPayload(actualizada),
            createdAt: ahora,
          });
        } else {
          const nueva: LocalPurchaseItem = {
            id: crypto.randomUUID(),
            purchase_id: fila.id,
            product_id: l.product_id,
            cantidad: l.cantidad,
            costo_unitario: l.costo_unitario,
            deleted_at: null,
            created_at: ahora,
            updated_at: ahora,
          };
          await db.purchase_items.put(nueva);
          await db.outbox.add({
            table: "purchase_items",
            rowId: nueva.id,
            payload: lineaPayload(nueva),
            createdAt: ahora,
          });
        }
      }

      for (const previa of previas) {
        if (previa.deleted_at === null && !conservadas.has(previa.id)) {
          const borrada: LocalPurchaseItem = {
            ...previa,
            deleted_at: ahora,
            updated_at: ahora,
          };
          await db.purchase_items.put(borrada);
          await db.outbox.add({
            table: "purchase_items",
            rowId: previa.id,
            payload: lineaPayload(borrada),
            createdAt: ahora,
          });
        }
      }
    },
  );
}

export async function deletePurchase(db: VendoraDB, id: string): Promise<void> {
  const ahora = new Date().toISOString();
  await db.transaction(
    "rw",
    db.purchases,
    db.purchase_items,
    db.outbox,
    async () => {
      const existente = await db.purchases.get(id);
      if (!existente) return;

      const lineas = await db.purchase_items
        .where("purchase_id")
        .equals(id)
        .filter((i) => i.deleted_at === null)
        .toArray();
      for (const l of lineas) {
        const borrada: LocalPurchaseItem = {
          ...l,
          deleted_at: ahora,
          updated_at: ahora,
        };
        await db.purchase_items.put(borrada);
        await db.outbox.add({
          table: "purchase_items",
          rowId: l.id,
          payload: lineaPayload(borrada),
          createdAt: ahora,
        });
      }

      const fila: LocalPurchase = {
        ...existente,
        deleted_at: ahora,
        updated_at: ahora,
      };
      await db.purchases.put(fila);
      await db.outbox.add({
        table: "purchases",
        rowId: id,
        payload: compraPayload(fila),
        createdAt: ahora,
      });
    },
  );
}

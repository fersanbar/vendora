import Dexie, { type EntityTable } from "dexie";

export interface LocalProduct {
  id: string;
  nombre: string;
  sku: string | null;
  codigo_barras: string | null;
  categoria: string | null;
  notas: string | null;
  activo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalListing {
  id: string;
  product_id: string;
  channel_id: string;
  id_externo: string | null;
  precio_venta: number;
  comision_pct: number;
  cargo_fijo: number;
  costo_envio: number;
  dias_liberacion: number;
  activo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalChannel {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
}

export interface LocalTaxType {
  id: string;
  nombre: string;
  clave: "iva" | "isr" | "otro";
  tasa_pct: number | null;
  activo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalListingTax {
  id: string;
  listing_id: string;
  tax_type_id: string;
  tasa_pct: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalProfile {
  id: string;
  nombre: string | null;
  moneda: string;
  iva_general_pct: number;
  created_at: string;
  updated_at: string;
}

export interface LocalSupplier {
  id: string;
  nombre: string;
  activo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalPurchase {
  id: string;
  supplier_id: string | null;
  fecha: string;
  metodo_pago: "efectivo" | "debito" | "credito" | "transferencia" | "otro";
  folio: string | null;
  notas: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalPurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  cantidad: number;
  costo_unitario: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalSale {
  id: string;
  product_id: string;
  channel_id: string;
  fecha: string;
  cantidad: number;
  precio_unitario: number;
  comision: number;
  cargo_fijo: number;
  costo_envio: number;
  impuestos: number;
  costo_unitario: number | null;
  estado_cobro: "pendiente" | "liberado";
  fecha_liberacion_estimada: string | null;
  fecha_liberacion_real: string | null;
  id_orden: string | null;
  notas: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalExpenseCategory {
  id: string;
  nombre: string;
  activo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalExpense {
  id: string;
  category_id: string | null;
  fecha: string;
  monto: number;
  metodo_pago: LocalPurchase["metodo_pago"];
  concepto: string | null;
  notas: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalAdSpend {
  id: string;
  fecha: string;
  plataforma:
    | "meta"
    | "mercado_ads"
    | "amazon_ads"
    | "tiktok"
    | "google"
    | "otro";
  monto: number;
  ventas_atribuidas: number | null;
  channel_id: string | null;
  product_id: string | null;
  notas: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutboxItem {
  seq?: number;
  table:
    | "products"
    | "listings"
    | "tax_types"
    | "listing_taxes"
    | "profiles"
    | "suppliers"
    | "purchases"
    | "purchase_items"
    | "sales"
    | "expense_categories"
    | "expenses"
    | "ad_spends";
  rowId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  error?: string;
}

export interface MetaItem {
  key: string;
  value: string;
}

export class VendoraDB extends Dexie {
  products!: EntityTable<LocalProduct, "id">;
  listings!: EntityTable<LocalListing, "id">;
  channels!: EntityTable<LocalChannel, "id">;
  tax_types!: EntityTable<LocalTaxType, "id">;
  listing_taxes!: EntityTable<LocalListingTax, "id">;
  profiles!: EntityTable<LocalProfile, "id">;
  outbox!: EntityTable<OutboxItem, "seq">;
  meta!: EntityTable<MetaItem, "key">;
  suppliers!: EntityTable<LocalSupplier, "id">;
  purchases!: EntityTable<LocalPurchase, "id">;
  purchase_items!: EntityTable<LocalPurchaseItem, "id">;
  sales!: EntityTable<LocalSale, "id">;
  expense_categories!: EntityTable<LocalExpenseCategory, "id">;
  expenses!: EntityTable<LocalExpense, "id">;
  ad_spends!: EntityTable<LocalAdSpend, "id">;

  constructor(userId: string) {
    super(`vendora-${userId}`);
    this.version(1).stores({
      products: "id, nombre, updated_at, deleted_at",
      listings: "id, product_id, channel_id, updated_at",
      channels: "id",
      outbox: "++seq, rowId",
      meta: "key",
    });
    this.version(2).stores({
      tax_types: "id, updated_at, deleted_at",
      tax_entries: "id, tax_type_id, periodo, estado, updated_at",
    });
    this.version(3)
      .stores({
        listing_taxes: "id, listing_id, tax_type_id, updated_at",
        tax_entries: null,
      })
      .upgrade((tx) =>
        tx
          .table("outbox")
          .filter((i: { table: string }) => i.table === "tax_entries")
          .delete(),
      );
    this.version(4).stores({
      profiles: "id, updated_at",
    });
    this.version(5).stores({
      suppliers: "id, updated_at, deleted_at",
      purchases: "id, supplier_id, fecha, updated_at",
      purchase_items: "id, purchase_id, product_id, updated_at",
    });
    this.version(6).stores({
      sales: "id, product_id, channel_id, fecha, updated_at",
    });
    this.version(7).stores({
      expense_categories: "id, updated_at, deleted_at",
      expenses: "id, category_id, fecha, updated_at",
      ad_spends: "id, fecha, channel_id, product_id, updated_at",
    });
  }
}

// Una base local por usuario: dos cuentas en el mismo teléfono nunca se mezclan
const cache = new Map<string, VendoraDB>();

export function getUserDb(userId: string): VendoraDB {
  let db = cache.get(userId);
  if (!db) {
    db = new VendoraDB(userId);
    cache.set(userId, db);
  }
  return db;
}

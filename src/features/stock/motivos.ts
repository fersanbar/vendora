import type { LocalStockAdjustment } from "@/lib/db";

type Motivo = LocalStockAdjustment["motivo"];

export const ETIQUETA_MOTIVO: Record<Motivo, string> = {
  inicial: "Inventario inicial",
  conteo: "Conteo físico",
  devolucion: "Devolución",
  merma: "Merma o daño",
  regalo: "Regalo o muestra",
  otro: "Otro",
};

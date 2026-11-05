import { useState, type FormEvent } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Campo } from "@/components/Campo";
import type { LocalProduct } from "@/lib/db";
import { useSync } from "@/features/sync/useSync";
import { deleteProduct, saveProduct } from "./products.repo";

const vacioANull = (v: string) => (v.trim() === "" ? null : v.trim());

export function ProductForm({
  producto,
  onDone,
}: {
  producto: LocalProduct | null;
  onDone: () => void;
}) {
  const { db, syncNow } = useSync();
  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [sku, setSku] = useState(producto?.sku ?? "");
  const [codigo, setCodigo] = useState(producto?.codigo_barras ?? "");
  const [categoria, setCategoria] = useState(producto?.categoria ?? "");
  const [notas, setNotas] = useState(producto?.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await saveProduct(
        db,
        {
          nombre: nombre.trim(),
          sku: vacioANull(sku),
          codigo_barras: vacioANull(codigo),
          categoria: vacioANull(categoria),
          notas: vacioANull(notas),
        },
        producto?.id,
      );
      onDone();
      void syncNow();
    } catch (err) {
      setError(
        err instanceof Error && err.message === "SKU_DUPLICADO"
          ? "Ya tienes un producto con ese SKU."
          : "No se pudo guardar el producto.",
      );
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!producto) return;
    await deleteProduct(db, producto.id);
    onDone();
    void syncNow();
  }

  return (
    <div className="max-h-[85dvh] overflow-y-auto">
      <DrawerHeader className="text-left">
        <DrawerTitle>
          {producto ? "Editar producto" : "Nuevo producto"}
        </DrawerTitle>
        <DrawerDescription>
          Se guarda en tu teléfono y se sincroniza cuando haya internet.
        </DrawerDescription>
      </DrawerHeader>

      <form onSubmit={guardar} className="space-y-4 px-4 pb-6">
        <Campo
          id="nombre"
          label="Nombre"
          value={nombre}
          onChange={setNombre}
          maxLength={120}
        />
        <div className="grid grid-cols-2 gap-3">
          <Campo
            id="sku"
            label="SKU (automático si está vacío)"
            value={sku}
            onChange={setSku}
            maxLength={60}
          />{" "}
          <Campo
            id="categoria"
            label="Categoría"
            value={categoria}
            onChange={setCategoria}
            maxLength={60}
          />
        </div>
        <Campo
          id="codigo"
          label="Código de barras"
          value={codigo}
          onChange={setCodigo}
          maxLength={60}
          inputMode="numeric"
        />
        <Campo
          id="notas"
          label="Notas"
          value={notas}
          onChange={setNotas}
          maxLength={1000}
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={guardando} className="h-11 w-full">
          {guardando && <Loader2 className="mr-2 size-4 animate-spin" />}
          Guardar
        </Button>

        {producto &&
          (confirmando ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setConfirmando(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 flex-1"
                onClick={eliminar}
              >
                Sí, eliminar
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-full text-red-600"
              onClick={() => setConfirmando(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Eliminar producto
            </Button>
          ))}
      </form>
    </div>
  );
}

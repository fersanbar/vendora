export function Placeholder({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
      <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-6 text-center">
        <p className="text-sm text-neutral-500">{detalle}</p>
      </div>
    </div>
  )
}
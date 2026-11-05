
import { Link, useLocation } from 'react-router-dom'
import { Package, ShoppingBasket } from 'lucide-react'

export function InventarioTabs() {
  const { pathname } = useLocation()
  const comprasActivas = pathname.startsWith('/inventario/compras')

  const base =
    'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'

  return (
    <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
      <Link
        to="/inventario"
        className={`${base} ${
          !comprasActivas
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        <Package className="size-4" />
        Productos
      </Link>

      <Link
        to="/inventario/compras"
        className={`${base} ${
          comprasActivas
            ? 'bg-white text-neutral-900 shadow-sm'
            : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        <ShoppingBasket className="size-4" />
        Compras
      </Link>
    </div>
  )
}

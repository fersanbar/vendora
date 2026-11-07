
import { Link, useLocation } from 'react-router-dom'
import { Package, ShoppingBasket } from 'lucide-react'

export function InventarioTabs() {
  const { pathname } = useLocation()
  const comprasActivas = pathname.startsWith('/inventario/compras')

  const base =
    'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200'

  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-100 bg-slate-100/80 p-1.5">
      <Link
        to="/inventario"
        aria-current={!comprasActivas ? 'page' : undefined}
        className={`${base} ${
          !comprasActivas
            ? 'bg-white text-[#202f69] shadow-sm shadow-slate-200/70'
            : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
        }`}
      >
        <Package
          className={`size-4 ${
            !comprasActivas ? 'text-violet-600' : 'text-slate-400'
          }`}
        />
        Productos
      </Link>

      <Link
        to="/inventario/compras"
        aria-current={comprasActivas ? 'page' : undefined}
        className={`${base} ${
          comprasActivas
            ? 'bg-white text-[#202f69] shadow-sm shadow-slate-200/70'
            : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
        }`}
      >
        <ShoppingBasket
          className={`size-4 ${
            comprasActivas ? 'text-violet-600' : 'text-slate-400'
          }`}
        />
        Compras
      </Link>
    </div>
  )
}

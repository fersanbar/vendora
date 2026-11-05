import { NavLink, Outlet } from 'react-router-dom'
import { Home, Package, Receipt, Wallet, Menu } from 'lucide-react'

const items = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/ventas', label: 'Ventas', icon: Receipt },
  { to: '/finanzas', label: 'Finanzas', icon: Wallet },
  { to: '/mas', label: 'Más', icon: Menu },
]

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <main className="flex-1 pb-24">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto flex max-w-xl">
          {items.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${
                    isActive ? 'text-neutral-900' : 'text-neutral-400'
                  }`
                }
              >
                <Icon className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
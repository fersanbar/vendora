
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useAuth } from "@/features/auth/useAuth";
import { ChannelsPage } from "@/features/channels/ChannelsPage";
import { AppShell } from "@/components/layout/AppShell";
import { ProductsPage } from "@/features/products/ProductsPage";
import { ProductDetailPage } from "@/features/products/ProductDetailPage";
import {
  ChevronRight,
  Landmark,
  LogOut,
  Store,
  UserRound,
  Settings2,
} from "lucide-react";
import { TaxTypesPage } from "@/features/taxes/TaxTypesPage";
import { PurchasesPage } from "@/features/purchases/PurchasesPage";
import { PurchaseFormPage } from "@/features/purchases/PurchaseFormPage";
import { SalesPage } from "@/features/sales/SalesPage";
import { SaleFormPage } from "@/features/sales/SaleFormPage";
import { FinanzasPage } from "@/features/finance/FinanzasPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { ExpenseCategoriesPage } from "@/features/expenses/ExpenseCategoriesPage";
import { AdsPage } from "@/features/ads/AdsPage";
import { InicioPage } from "@/features/home/InicioPage";
import { FlujoPage } from "@/features/finance/FlujoPage";
import { RentabilidadPage } from "@/features/finance/RentabilidadPage";

function MorePage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-8 pt-5">
      {/* Encabezado */}
      <div className="mb-7">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Settings2 size={19} />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
            Configuración
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Más
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Administra las preferencias de tu cuenta y negocio.
        </p>
      </div>

      {/* Perfil */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336a9] text-white shadow-sm">
          <UserRound size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            Tu cuenta
          </p>
          <p className="truncate text-xs text-slate-500">
            {user?.email}
          </p>
        </div>
      </div>

      {/* Opciones */}
      <div>
        <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Administración
        </p>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Link
            to="/mas/canales"
            className="group flex min-h-[76px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100">
                <Store size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">
                  Canales de venta
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Administra tus canales y plataformas
                </span>
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-600" />
          </Link>

          <div className="mx-4 border-t border-slate-100" />

          <Link
            to="/mas/impuestos"
            className="group flex min-h-[76px] items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition-colors group-hover:bg-violet-100">
                <Landmark size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">
                  Impuestos
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Configura tasas y tipos de impuestos
                </span>
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-600" />
          </Link>
        </div>
      </div>

      {/* Sesión */}
      <div className="mt-7">
        <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Cuenta
        </p>

        <button
          onClick={signOut}
          className="flex min-h-[58px] w-full items-center gap-3 rounded-2xl border border-rose-100 bg-white px-4 text-left text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-rose-50">
            <LogOut size={18} />
          </span>
          Cerrar sesión
        </button>
      </div>

      <p className="mt-8 text-center text-[11px] font-medium tracking-wide text-slate-400">
        VENDORA · GESTIÓN DE NEGOCIO
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<InicioPage />} />
              <Route path="inventario" element={<ProductsPage />} />
              <Route path="inventario/:id" element={<ProductDetailPage />} />
              <Route path="inventario/compras" element={<PurchasesPage />} />
              <Route
                path="inventario/compras/nueva"
                element={<PurchaseFormPage />}
              />
              <Route
                path="inventario/compras/:id"
                element={<PurchaseFormPage />}
              />
              <Route path="ventas" element={<SalesPage />} />
              <Route path="ventas/nueva" element={<SaleFormPage />} />
              <Route path="ventas/:id" element={<SaleFormPage />} />
              <Route path="finanzas" element={<FinanzasPage />} />
              <Route path="finanzas/flujo" element={<FlujoPage />} />
              <Route
                path="finanzas/rentabilidad"
                element={<RentabilidadPage />}
              />
              <Route path="finanzas/gastos" element={<ExpensesPage />} />
              <Route
                path="finanzas/gastos/categorias"
                element={<ExpenseCategoriesPage />}
              />
              <Route path="finanzas/publicidad" element={<AdsPage />} />
              <Route path="mas" element={<MorePage />} />
              <Route path="mas/canales" element={<ChannelsPage />} />
              <Route path="mas/impuestos" element={<TaxTypesPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

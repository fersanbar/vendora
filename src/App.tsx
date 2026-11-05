import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { LoginPage } from "@/features/auth/LoginPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useAuth } from "@/features/auth/useAuth";
import { ChannelsPage } from "@/features/channels/ChannelsPage";
import { AppShell } from "@/components/layout/AppShell";
import { Placeholder } from "@/pages/Placeholder";
import { ProductsPage } from "@/features/products/ProductsPage";
import { ProductDetailPage } from "@/features/products/ProductDetailPage";
import { ChevronRight, Landmark, LogOut, Store } from "lucide-react";
import { TaxTypesPage } from "@/features/taxes/TaxTypesPage";
import { PurchasesPage } from "@/features/purchases/PurchasesPage";
import { PurchaseFormPage } from "@/features/purchases/PurchaseFormPage";
import { SalesPage } from "@/features/sales/SalesPage";
import { SaleFormPage } from "@/features/sales/SaleFormPage";
import { FinanzasPage } from "@/features/finance/FinanzasPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { ExpenseCategoriesPage } from "@/features/expenses/ExpenseCategoriesPage";
import { AdsPage } from "@/features/ads/AdsPage";

function MorePage() {
  const { user, signOut } = useAuth();
  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Más</h1>
      <p className="mt-1 text-sm text-neutral-500">{user?.email}</p>
      <div className="mt-6 divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        <Link
          to="/mas/canales"
          className="flex h-14 items-center justify-between px-4"
        >
          <span className="flex items-center gap-3">
            <Store className="size-5" />
            Canales de venta
          </span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>

        {/* El enlace de Impuestos se movió aquí, donde debe renderingarse el menú */}
        <Link
          to="/mas/impuestos"
          className="flex h-14 items-center justify-between px-4"
        >
          <span className="flex items-center gap-3">
            <Landmark className="size-5" />
            Impuestos
          </span>
          <ChevronRight className="size-4 text-neutral-400" />
        </Link>

        <button
          onClick={signOut}
          className="flex h-14 w-full items-center gap-3 px-4 text-left text-red-600"
        >
          <LogOut className="size-5" />
          Cerrar sesión
        </button>
      </div>
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
              <Route
                index
                element={
                  <Placeholder
                    titulo="Inicio"
                    detalle="El resumen se construye cuando existan compras y ventas reales."
                  />
                }
              />
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

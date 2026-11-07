
import { Navigate, Outlet } from 'react-router-dom'
import { Boxes, Loader2 } from 'lucide-react'
import { useAuth } from './useAuth'
import { SyncProvider } from '@/features/sync/SyncProvider'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-50">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#172554] to-[#6336A9] text-white shadow-lg shadow-indigo-950/15">
          <Boxes className="size-7" />
        </div>

        <p className="mt-4 text-sm font-bold tracking-[0.14em] text-[#172554]">
          VENDORA
        </p>

        <Loader2 className="mt-5 size-5 animate-spin text-violet-600" />
        <p className="mt-2 text-xs text-slate-400">
          Preparando tu espacio de trabajo...
        </p>
      </div>
    )
  }

  return session ? (
    <SyncProvider>
      <Outlet />
    </SyncProvider>
  ) : (
    <Navigate to="/login" replace />
  )
}

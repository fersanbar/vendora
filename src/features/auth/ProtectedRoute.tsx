import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './useAuth'
import { SyncProvider } from '@/features/sync/SyncProvider'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-neutral-400" />
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
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { SunLoader } from './SunLoader'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)

  if (status === 'loading') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-bg text-text">
        <SunLoader />
      </div>
    )
  }

  if (status === 'signed_out') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

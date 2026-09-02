import { useMyPermissionsLoaded } from '@/hooks/use-my-permissions'
import { useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const permissionsLoaded = useMyPermissionsLoaded()

  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/login" replace />
  // Gating below would read an empty permission set and redirect away from a permitted page.
  if (!permissionsLoaded) return null

  return <>{children}</>
}

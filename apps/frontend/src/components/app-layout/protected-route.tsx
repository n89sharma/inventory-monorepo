import { invalidateMyPermissions, useMyPermissionsState } from '@/hooks/use-my-permissions'
import { useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()
  const { loaded, failed } = useMyPermissionsState()

  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/login" replace />
  if (failed) return <PermissionsUnavailable />
  // Gating below would read an empty permission set and redirect away from a permitted page.
  if (!loaded) return null

  return <>{children}</>
}

function PermissionsUnavailable() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold">Could not load your permissions</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        The server did not say what you are allowed to do, so there is nothing safe to show yet.
      </p>
      <button
        onClick={() => invalidateMyPermissions()}
        className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
      >
        Try again
      </button>
    </div>
  )
}

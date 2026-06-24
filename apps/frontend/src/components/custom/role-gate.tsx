import { Navigate } from 'react-router-dom'
import type { AppRole } from 'shared-types'
import { useHasRole } from '@/hooks/use-role'

interface RoleGateProps {
  allow: AppRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGate({
  allow,
  children,
  fallback = <Navigate to="/" replace />,
}: RoleGateProps) {
  const hasRole = useHasRole(...allow)
  return hasRole ? <>{children}</> : <>{fallback}</>
}

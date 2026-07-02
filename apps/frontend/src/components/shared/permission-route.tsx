import { type Permission } from 'shared-types'
import { Navigate } from 'react-router-dom'
import { useCan } from '@/hooks/use-can'

interface PermissionRouteProps {
  permission: Permission
  children: React.ReactNode
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const can = useCan(permission)
  if (!can) return <Navigate to="/" replace />
  return <>{children}</>
}

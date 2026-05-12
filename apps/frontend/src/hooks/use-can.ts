import { ROLE_PERMISSIONS, type Permission } from 'shared-types'
import { useRole } from './use-role'

export function useCan(permission: Permission): boolean {
  const role = useRole()
  if (!role) return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

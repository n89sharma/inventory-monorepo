import { useCallback } from 'react'
import { ROLE_PERMISSIONS, type Permission } from 'shared-types'
import { useRole } from './use-role'

export function useCan(): (permission: Permission) => boolean
export function useCan(permission: Permission): boolean
export function useCan(
  permission?: Permission,
): boolean | ((p: Permission) => boolean) {
  const role = useRole()
  const check = useCallback(
    (p: Permission) => role !== null && ROLE_PERMISSIONS[role].includes(p),
    [role],
  )
  if (permission === undefined) return check
  return check(permission)
}

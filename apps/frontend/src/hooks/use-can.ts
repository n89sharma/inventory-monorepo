import { useCallback } from 'react'
import { type Permission } from 'shared-types'
import { useMyPermissions } from './use-my-permissions'

export function useCan(): (permission: Permission) => boolean
export function useCan(permission: Permission): boolean
export function useCan(permission?: Permission): boolean | ((p: Permission) => boolean) {
  const permissions = useMyPermissions()
  const check = useCallback((p: Permission) => permissions.includes(p), [permissions])
  if (permission === undefined) return check
  return check(permission)
}

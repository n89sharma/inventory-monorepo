import { useAuth } from '@clerk/react'
import type { AppRole } from 'shared-types'

export function useRole(): AppRole | null {
  const { sessionClaims } = useAuth()
  return (sessionClaims?.metadata?.role ?? null) as AppRole | null
}

export function useHasRole(...allowed: AppRole[]): boolean {
  const role = useRole()
  return role !== null && allowed.includes(role)
}

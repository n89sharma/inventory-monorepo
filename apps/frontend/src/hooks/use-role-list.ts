import { getRoles } from '@/data/api/role-api'
import { CATALOG_DATA_OPTIONS } from '@/lib/swr-options'
import type { Role } from 'shared-types'
import useSWR from 'swr'

const ROLES_KEY = 'roles'
const EMPTY_ROLES: Role[] = []

export function useRoles(): Role[] {
  return useSWR(ROLES_KEY, getRoles, CATALOG_DATA_OPTIONS).data ?? EMPTY_ROLES
}

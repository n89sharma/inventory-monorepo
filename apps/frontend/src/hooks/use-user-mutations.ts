import {
  setUserRole as setUserRoleApi,
  toggleUserActive as toggleUserActiveApi,
} from '@/data/api/user-api'
import { invalidateUsers } from '@/hooks/use-user'
import type { AppRole } from 'shared-types'

async function setUserRole(userId: number, role: AppRole): Promise<void> {
  await setUserRoleApi(userId, role)
  invalidateUsers()
}

async function toggleUserActive(userId: number, isActive: boolean): Promise<void> {
  await toggleUserActiveApi(userId, isActive)
  invalidateUsers()
}

const mutations = {
  setUserRole,
  toggleUserActive,
} as const

export function useUserMutations() {
  return mutations
}

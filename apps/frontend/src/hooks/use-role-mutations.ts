import {
  createRole as createRoleApi,
  deleteRole as deleteRoleApi,
  renameRole as renameRoleApi,
  setRolePermissions as setRolePermissionsApi,
} from '@/data/api/role-api'
import { invalidateMyPermissions } from '@/hooks/use-my-permissions'
import { invalidateRoles } from '@/hooks/use-role-list'
import type { Permission, Role } from 'shared-types'

async function createRole(name: string, permissions: Permission[]): Promise<Role> {
  const role = await createRoleApi(name, permissions)
  invalidateRoles()
  return role
}

async function renameRole(code: string, name: string): Promise<void> {
  await renameRoleApi(code, name)
  invalidateRoles()
}

// The editor may be changing their own role's grants, so the viewer's own permissions go too.
async function setRolePermissions(code: string, permissions: Permission[]): Promise<void> {
  await setRolePermissionsApi(code, permissions)
  invalidateRoles()
  invalidateMyPermissions()
}

async function deleteRole(code: string): Promise<void> {
  await deleteRoleApi(code)
  invalidateRoles()
}

const mutations = {
  createRole,
  renameRole,
  setRolePermissions,
  deleteRole,
} as const

export function useRoleMutations() {
  return mutations
}

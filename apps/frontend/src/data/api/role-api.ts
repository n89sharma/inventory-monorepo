import { api } from '@/data/api/axios-client'
import type {
  CreateRole,
  MyPermissions,
  Permission,
  Role,
  SetRolePermissions,
  UpdateRole,
} from 'shared-types'
import {
  CreateRoleSchema,
  MyPermissionsSchema,
  RoleSchema,
  SetRolePermissionsSchema,
  UpdateRoleSchema,
} from 'shared-types'
import { z } from 'zod'

export async function getRoles(): Promise<Role[]> {
  const { data } = await api.get<Role[]>('/roles')
  return z.array(RoleSchema).parse(data)
}

export async function getMyPermissions(): Promise<MyPermissions> {
  const { data } = await api.get<MyPermissions>('/me/permissions')
  return MyPermissionsSchema.parse(data)
}

export async function createRole(name: string, permissions: Permission[]): Promise<Role> {
  const createRoleBody = CreateRoleSchema.parse({ name, permissions } satisfies CreateRole)
  const { data } = await api.post<Role>('/roles', createRoleBody)
  return RoleSchema.parse(data)
}

export async function renameRole(code: string, name: string): Promise<void> {
  const renameRoleBody = UpdateRoleSchema.parse({ name } satisfies UpdateRole)
  await api.patch(`/roles/${code}`, renameRoleBody)
}

export async function setRolePermissions(code: string, permissions: Permission[]): Promise<void> {
  const setRolePermissionsBody = SetRolePermissionsSchema.parse({
    permissions,
  } satisfies SetRolePermissions)
  await api.put(`/roles/${code}/permissions`, setRolePermissionsBody)
}

export async function deleteRole(code: string): Promise<void> {
  await api.delete(`/roles/${code}`)
}

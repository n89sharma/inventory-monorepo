import { api } from '@/data/api/axios-client'
import type { MyPermissions, Role } from 'shared-types'
import { MyPermissionsSchema, RoleSchema } from 'shared-types'
import { z } from 'zod'

export async function getRoles(): Promise<Role[]> {
  const { data } = await api.get<Role[]>('/roles')
  return z.array(RoleSchema).parse(data)
}

export async function getMyPermissions(): Promise<MyPermissions> {
  const { data } = await api.get<MyPermissions>('/me/permissions')
  return MyPermissionsSchema.parse(data)
}

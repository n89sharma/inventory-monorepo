import { api } from '@/data/api/axios-client'
import type { AppRole, SetRole, ToggleActive, User } from 'shared-types'
import { SetRoleSchema, ToggleActiveSchema, UserSchema } from 'shared-types'
import { z } from 'zod'

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users')
  return z.array(UserSchema).parse(data)
}

export async function setUserRole(userId: number, role: AppRole): Promise<void> {
  const setUserRoleBody = SetRoleSchema.parse({ role } satisfies SetRole)
  await api.put(`/admin/users/${userId}/role`, setUserRoleBody)
}

export async function toggleUserActive(userId: number, isActive: boolean): Promise<void> {
  const toggleUserActiveBody = ToggleActiveSchema.parse({
    is_active: isActive,
  } satisfies ToggleActive)
  await api.patch(`/admin/users/${userId}`, toggleUserActiveBody)
}

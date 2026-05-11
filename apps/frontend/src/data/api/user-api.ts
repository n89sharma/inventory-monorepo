import { api } from '@/data/api/axios-client'
import type { AppRole, User } from 'shared-types'
import { UserSchema } from 'shared-types'
import { z } from 'zod'

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<{ success: true; data: User[] }>('/users')
  return z.array(UserSchema).parse(data.data)
}

export async function setUserRole(userId: number, role: AppRole): Promise<void> {
  await api.put(`/admin/users/${userId}/role`, { role })
}

export async function toggleUserActive(userId: number, isActive: boolean): Promise<void> {
  await api.patch(`/admin/users/${userId}`, { is_active: isActive })
}

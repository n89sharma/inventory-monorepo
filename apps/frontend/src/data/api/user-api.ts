import { api } from '@/data/api/axios-client'
import { type User, UserSchema } from 'shared-types'
import { z } from 'zod'

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<{ success: true; data: User[] }>('/users', { params: { filterActive: true } })
  return z.array(UserSchema).parse(data.data)
}

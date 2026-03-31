import { api } from '@/data/api/axios-client'
import { type ApiResponse, type User, UserSchema } from 'shared-types'
import { z } from 'zod'

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<ApiResponse<User[]>>('/users', { params: { filterActive: true } })
  if (data.success) return z.array(UserSchema).parse(data.data)
  throw new Error(data.error.summary)
}

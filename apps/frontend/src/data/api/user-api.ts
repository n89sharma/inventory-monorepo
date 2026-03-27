import { api } from '@/data/api/axios-client'
import { type User, UserSchema } from 'shared-types'
import { z } from 'zod'

export async function getUsers(): Promise<User[]> {
  const res = await api.get('/users', { params: { filterActive: true } })
  return z.array(UserSchema).parse(res.data)
}

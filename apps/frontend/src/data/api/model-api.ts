import { api } from '@/data/api/axios-client'
import { type Model, ModelSchema } from 'shared-types'
import { z } from 'zod'

export async function getModels(): Promise<Model[]> {
  const res = await api.get('/models')
  return z.array(ModelSchema).parse(res.data)
}
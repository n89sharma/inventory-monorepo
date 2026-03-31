import { api } from '@/data/api/axios-client'
import { type ApiResponse, type Model, ModelSchema } from 'shared-types'
import { z } from 'zod'

export async function getModels(): Promise<Model[]> {
  const { data } = await api.get<ApiResponse<Model[]>>('/models')
  if (data.success) return z.array(ModelSchema).parse(data.data)
  throw new Error(data.error.summary)
}
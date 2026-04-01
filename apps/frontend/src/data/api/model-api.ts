import { api } from '@/data/api/axios-client'
import { type ApiResponse, type ModelSummary, ModelSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getModels(): Promise<ModelSummary[]> {
  const { data } = await api.get<ApiResponse<ModelSummary[]>>('/models')
  if (data.success) return z.array(ModelSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}
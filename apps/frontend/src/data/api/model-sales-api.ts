import { api } from '@/data/api/axios-client'
import { ModelSalesResultSchema, type ModelSalesResult } from 'shared-types'

export async function getModelSales(modelId: number): Promise<ModelSalesResult> {
  const { data } = await api.get(`/search/model-sales`, { params: { modelId } })
  return ModelSalesResultSchema.parse(data)
}

import { api } from '@/data/api/axios-client'
import { ModelPriceHistoryResultSchema, type ModelPriceHistoryResult } from 'shared-types'

export async function getModelPriceHistory(modelId: number): Promise<ModelPriceHistoryResult> {
  const { data } = await api.get(`/reports/model-price-history`, { params: { modelId } })
  return ModelPriceHistoryResultSchema.parse(data)
}

import { api } from '@/data/api/axios-client'
import { ModelSalesResultSchema, type ModelSalesResult } from 'shared-types'

export async function getModelSales(modelId: number): Promise<ModelSalesResult> {
  const { data } = await api.get(`/reports/sold-report`, { params: { modelId } })
  return ModelSalesResultSchema.parse(data)
}

import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { ModelForm } from '@/ui-types/model-form-types'
import type { AxiosResponse } from 'axios'
import { type ApiResponse, type ModelSummary, ModelSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getModels(): Promise<ModelSummary[]> {
  const { data } = await api.get<ApiResponse<ModelSummary[]>>('/models')
  if (data.success) return z.array(ModelSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function createModel(form: ModelForm): Promise<ApiResponse<{ id: number }>> {
  return api.post(
    '/models',
    {
      name: form.name,
      weight: form.weight,
      size: form.size,
      brand_id: form.brand!.id,
      asset_type_id: (form.assetType as { state: 'SELECTED'; selected: { id: number } }).selected.id
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then((res: AxiosResponse<{ id: number }>) => ({ success: true as const, data: res.data }))
    .catch(apiErrorHandler<{ id: number }>)
}
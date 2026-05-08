import { api } from '@/data/api/axios-client'
import type { ModelForm } from '@/ui-types/model-form-types'
import { type ModelSummary, ModelSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getModels(): Promise<ModelSummary[]> {
  const { data } = await api.get<{ success: true; data: ModelSummary[] }>('/models')
  return z.array(ModelSummarySchema).parse(data.data)
}

export async function createModel(form: ModelForm): Promise<{ id: number }> {
  return (await api.post<{ id: number }>('/models', {
    name: form.name,
    weight: form.weight,
    size: form.size,
    brand_id: form.brand!.id,
    asset_type_id: (form.assetType as { state: 'SELECTED'; selected: { id: number } }).selected.id
  })).data
}

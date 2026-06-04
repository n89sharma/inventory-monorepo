import { api } from '@/data/api/axios-client'
import type { ModelForm } from '@/ui-types/model-form-types'
import { type CreateModel, CreateModelSchema, type ModelSummary, ModelSummarySchema } from 'shared-types'
import { z } from 'zod'

const CreateModelResponseSchema = z.object({ id: z.number() })

export async function getModels(): Promise<ModelSummary[]> {
  const { data } = await api.get<ModelSummary[]>('/models')
  return z.array(ModelSummarySchema).parse(data)
}

export async function createModel(form: ModelForm): Promise<{ id: number }> {
  const createModelBody = CreateModelSchema.parse({
    name: form.name,
    weight: form.weight,
    size: form.size,
    brand_id: form.brand!.id,
    asset_type_id: (form.assetType as { state: 'SELECTED'; selected: { id: number } }).selected.id,
    is_colour: form.is_colour
  } satisfies CreateModel)
  const { data } = await api.post<{ id: number }>('/models', createModelBody)
  return CreateModelResponseSchema.parse(data)
}

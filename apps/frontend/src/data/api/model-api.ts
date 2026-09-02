import { api } from '@/data/api/axios-client'
import type { ModelForm } from '@/ui-types/model-form-types'
import {
  type MergeModel,
  MergeModelSchema,
  type ModelMergePreview,
  ModelMergePreviewSchema,
  type CreateModel,
  CreateModelSchema,
  type ModelSummary,
  ModelSummarySchema,
  type UpdateModel,
  UpdateModelSchema,
} from 'shared-types'
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
    is_colour: form.is_colour,
  } satisfies CreateModel)
  const { data } = await api.post<{ id: number }>('/models', createModelBody)
  return CreateModelResponseSchema.parse(data)
}

export async function updateModel(id: number, form: ModelForm): Promise<void> {
  const updateModelBody = UpdateModelSchema.parse({
    name: form.name,
    weight: form.weight,
    size: form.size,
    brand_id: form.brand!.id,
    asset_type_id: (form.assetType as { state: 'SELECTED'; selected: { id: number } }).selected.id,
    is_colour: form.is_colour,
  } satisfies UpdateModel)
  await api.patch(`/models/${id}`, updateModelBody)
}

export async function previewModelMerge(ids: number[]): Promise<ModelMergePreview> {
  const { data } = await api.post<ModelMergePreview>('/models/merge/preview', { ids })
  return ModelMergePreviewSchema.parse(data)
}

export async function mergeModels(ids: number[], form: ModelForm): Promise<{ id: number }> {
  const mergeModelsBody = MergeModelSchema.parse({
    ids,
    model: {
      name: form.name,
      weight: form.weight,
      size: form.size,
      brand_id: form.brand!.id,
      asset_type_id: (form.assetType as { state: 'SELECTED'; selected: { id: number } }).selected
        .id,
      is_colour: form.is_colour,
    },
  } satisfies MergeModel)
  const { data } = await api.post<{ id: number }>('/models/merge', mergeModelsBody)
  return CreateModelResponseSchema.parse(data)
}

import {
  createModel as createModelApi,
  mergeModels as mergeModelsApi,
  updateModel as updateModelApi,
} from '@/data/api/model-api'
import { invalidateModels } from '@/hooks/use-model'
import type { ModelForm } from '@/ui-types/model-form-types'

async function createModel(form: ModelForm): Promise<{ id: number }> {
  const result = await createModelApi(form)
  invalidateModels()
  return result
}

async function updateModel(id: number, form: ModelForm): Promise<void> {
  await updateModelApi(id, form)
  invalidateModels()
}

async function mergeModels(ids: number[], form: ModelForm): Promise<{ id: number }> {
  const result = await mergeModelsApi(ids, form)
  invalidateModels()
  return result
}

const mutations = {
  createModel,
  updateModel,
  mergeModels,
} as const

export function useModelMutations() {
  return mutations
}

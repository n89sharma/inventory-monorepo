import { createModel as createModelApi, updateModel as updateModelApi } from '@/data/api/model-api'
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

const mutations = {
  createModel,
  updateModel,
} as const

export function useModelMutations() {
  return mutations
}

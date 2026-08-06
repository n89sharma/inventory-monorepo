import { createModel as createModelApi } from '@/data/api/model-api'
import { invalidateModels } from '@/hooks/use-model'
import type { ModelForm } from '@/ui-types/model-form-types'

async function createModel(form: ModelForm): Promise<{ id: number }> {
  const result = await createModelApi(form)
  invalidateModels()
  return result
}

const mutations = {
  createModel,
} as const

export function useModelMutations() {
  return mutations
}

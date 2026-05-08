import { createModel as createModelApi, getModels as getModelsApi } from '@/data/api/model-api'
import type { ModelForm } from '@/ui-types/model-form-types'
import type { ModelSummary } from 'shared-types'
import { create } from 'zustand'

interface ModelStore {
  models: ModelSummary[]
  loading: boolean

  setModels: (models: ModelSummary[]) => void
  setLoading: (loading: boolean) => void
  createModel: (data: ModelForm) => Promise<{ id: number }>
  clearModels: () => void
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [],
  loading: false,

  setModels: (models) => set({ models }),
  setLoading: (loading) => set({ loading }),
  createModel: async (data) => {
    const result = await createModelApi(data)
    set({ models: await getModelsApi() })
    return result
  },
  clearModels: () => set({ models: [] })
}))

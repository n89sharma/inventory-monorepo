import { createModel as createModelApi, getModels as getModelsApi } from '@/data/api/model-api'
import type { ModelForm } from '@/ui-types/model-form-types'
import type { ApiResponse, ModelSummary } from 'shared-types'
import { create } from 'zustand'

interface ModelStore {
  models: ModelSummary[]
  loading: boolean

  setModels: (models: ModelSummary[]) => void
  setLoading: (loading: boolean) => void
  createModel: (data: ModelForm) => Promise<ApiResponse<{ id: number }>>
  clearModels: () => void
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [],
  loading: false,

  setModels: (models) => set({ models }),
  setLoading: (loading) => set({ loading }),
  createModel: async (data) => {
    const response = await createModelApi(data)
    if (response.success) set({ models: await getModelsApi() })
    return response
  },
  clearModels: () => set({ models: [] })
}))

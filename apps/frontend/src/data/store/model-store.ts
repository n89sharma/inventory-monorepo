import type { ModelSummary } from 'shared-types'
import { create } from 'zustand'

interface ModelStore {
  models: ModelSummary[]
  loading: boolean

  setModels: (models: ModelSummary[]) => void
  setLoading: (loading: boolean) => void

  clearModels: () => void
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [],
  loading: false,

  setModels: (models) => set({ models }),
  setLoading: (loading) => set({ loading }),
  clearModels: () => set({ models: [] })
}))
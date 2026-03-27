import type { Model } from 'shared-types'
import { create } from 'zustand'

interface ModelStore {
  models: Model[]
  loading: boolean

  setModels: (models: Model[]) => void
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
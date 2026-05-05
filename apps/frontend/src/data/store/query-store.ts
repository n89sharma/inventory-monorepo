import type { AssetSummary, ModelSummary, Status, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface QueryStore {
  assets: AssetSummary[]
  model: ModelSummary | null
  meter: number | null
  availabilityStatuses: Status[]
  technicalStatuses: Status[]
  selectedWarehouses: Warehouse[]
  hasSearched: boolean

  setAssets: (assets: AssetSummary[]) => void
  setModel: (model: ModelSummary | null) => void
  setMeter: (meter: number | null) => void
  setAvailabilityStatuses: (statuses: Status[]) => void
  setTechnicalStatuses: (statuses: Status[]) => void
  setSelectedWarehouses: (warehouses: Warehouse[]) => void
  setHasSearched: (hasSearched: boolean) => void
}

export const useQueryStore = create<QueryStore>((set) => ({
  assets: [],
  model: null,
  meter: null,
  availabilityStatuses: [],
  technicalStatuses: [],
  selectedWarehouses: [],
  hasSearched: false,

  setAssets: (assets) => set({ assets }),
  setModel: (model) => set({ model }),
  setMeter: (meter) => set({ meter }),
  setAvailabilityStatuses: (availabilityStatuses) => set({ availabilityStatuses }),
  setTechnicalStatuses: (technicalStatuses) => set({ technicalStatuses }),
  setSelectedWarehouses: (selectedWarehouses) => set({ selectedWarehouses }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
}))

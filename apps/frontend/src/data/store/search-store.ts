import { getAssetsForQuery as getAssetsForQueryApi } from '@/data/api/asset-api'
import type { AssetSummary, ModelSummary, Status, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface SearchStore {
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
  searchAssets: (
    model: ModelSummary,
    meter: number | null,
    availabilityStatuses: Status[],
    technicalStatuses: Status[],
    warehouses: Warehouse[]
  ) => Promise<void>
}

export const useSearchStore = create<SearchStore>((set) => ({
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
  searchAssets: async (model, meter, availabilityStatuses, technicalStatuses, warehouses) => {
    const assets = await getAssetsForQueryApi(model, meter, availabilityStatuses, technicalStatuses, warehouses)
    set({ assets, hasSearched: true })
  },
}))

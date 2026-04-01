import { ANY_OPTION, type SelectOption } from '@/ui-types/select-option-types'
import type { AssetSummary, ModelSummary, Status, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface QueryStore {
  assets: AssetSummary[]
  model: ModelSummary | null
  meter: number | null
  availabilityStatus: SelectOption<Status>
  technicalStatus: SelectOption<Status>
  warehouse: SelectOption<Warehouse>
  hasSearched: boolean

  setAssets: (assets: AssetSummary[]) => void
  setModel: (model: ModelSummary | null) => void
  setMeter: (meter: number | null) => void
  setAvailabilityStatus: (status: SelectOption<Status>) => void
  setTechnicalStatus: (status: SelectOption<Status>) => void
  setWarehouse: (warehouse: SelectOption<Warehouse>) => void
  setHasSearched: (hasSearched: boolean) => void
}

export const useQueryStore = create<QueryStore>((set) => ({
  assets: [],
  model: null,
  meter: null,
  availabilityStatus: ANY_OPTION,
  technicalStatus: ANY_OPTION,
  warehouse: ANY_OPTION,
  hasSearched: false,

  setAssets: (assets) => set({ assets }),
  setModel: (model) => set({ model }),
  setMeter: (meter) => set({ meter }),
  setAvailabilityStatus: (availabilityStatus) => set({ availabilityStatus }),
  setTechnicalStatus: (technicalStatus) => set({ technicalStatus }),
  setWarehouse: (warehouse) => set({ warehouse }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
}))

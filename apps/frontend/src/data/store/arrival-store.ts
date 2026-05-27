import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { OrgSummary, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface ArrivalStore {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  destination: SelectOption<Warehouse>
  vendor: SelectOption<OrgSummary>
  hasSearched: boolean

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setDestination: (warehouse: SelectOption<Warehouse>) => void
  setVendor: (vendor: SelectOption<OrgSummary>) => void
  setHasSearched: (hasSearched: boolean) => void
}

export const useArrivalStore = create<ArrivalStore>((set) => ({
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  destination: ANY_OPTION,
  vendor: ANY_OPTION,
  hasSearched: false,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setDestination: (warehouse) => set({ destination: warehouse }),
  setVendor: (vendor) => set({ vendor }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
}))

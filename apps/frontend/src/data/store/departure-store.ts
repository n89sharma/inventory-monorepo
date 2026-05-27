import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { OrgSummary, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface DepartureStore {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  customer: SelectOption<OrgSummary>
  hasSearched: boolean

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setOrigin: (warehouse: SelectOption<Warehouse>) => void
  setCustomer: (customer: SelectOption<OrgSummary>) => void
  setHasSearched: (hasSearched: boolean) => void
}

export const useDepartureStore = create<DepartureStore>((set) => ({
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  customer: ANY_OPTION,
  hasSearched: false,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setCustomer: (customer) => set({ customer }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
}))

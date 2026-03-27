import type { ArrivalSummary, SelectOption, Warehouse } from 'shared-types'
import { ANY_OPTION, UNSELECTED } from 'shared-types'
import { create } from 'zustand'

interface ArrivalStore {
  arrivals: ArrivalSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  destination: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean

  setArrivals: (arrivals: ArrivalSummary[]) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setDestination: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void

  clearArrivals: () => void
}

export const useArrivalStore = create<ArrivalStore>((set) => ({
  arrivals: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  destination: ANY_OPTION,
  hasSearched: false,

  setArrivals: (arrivals) => set({ arrivals }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setDestination: (warehouse) => set({ destination: warehouse }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  clearArrivals: () => set({ arrivals: [] })
}))
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { getArrivalDetail } from '@/data/api/arrival-api'
import type { ArrivalDetail, ArrivalSummary, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface ArrivalStore {
  arrivals: ArrivalSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  destination: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean
  arrivalDetail: ArrivalDetail | null
  detailLoading: boolean
  detailError: string | null

  setArrivals: (arrivals: ArrivalSummary[]) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setDestination: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  setArrivalDetail: (arrivalDetail: ArrivalDetail) => void
  loadArrivalDetail: (arrivalNumber: string) => Promise<void>

  clearArrivals: () => void
}

export const useArrivalStore = create<ArrivalStore>((set, get) => ({
  arrivals: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  destination: ANY_OPTION,
  hasSearched: false,
  arrivalDetail: null,
  detailLoading: false,
  detailError: null,

  setArrivals: (arrivals) => set({ arrivals }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setDestination: (warehouse) => set({ destination: warehouse }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  setArrivalDetail: (arrivalDetail) => set({ arrivalDetail }),
  loadArrivalDetail: async (arrivalNumber) => {
    if (get().arrivalDetail?.arrival_number === arrivalNumber) return
    set({ detailLoading: true, detailError: null })
    try {
      set({ arrivalDetail: await getArrivalDetail(arrivalNumber) })
    } catch (e) {
      set({ detailError: e instanceof Error ? e.message : 'Failed to load arrival' })
    } finally {
      set({ detailLoading: false })
    }
  },
  clearArrivals: () => set({ arrivals: [] })
}))

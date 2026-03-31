import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { getDepartureDetail } from '@/data/api/departure-api'
import type { DepartureDetail, DepartureSummary, Warehouse } from 'shared-types'
import { create } from 'zustand'

interface DepartureStore {
  departures: DepartureSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean
  departureDetail: DepartureDetail | null
  detailLoading: boolean
  detailError: string | null

  setDepartures: (departures: DepartureSummary[]) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setOrigin: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  setDepartureDetail: (departureDetail: DepartureDetail) => void
  loadDepartureDetail: (departureNumber: string) => Promise<void>

  clearDepartures: () => void
}

export const useDepartureStore = create<DepartureStore>((set, get) => ({
  departures: [],
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  loading: false,
  hasSearched: false,
  departureDetail: null,
  detailLoading: false,
  detailError: null,

  setDepartures: (departures) => set({ departures }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setLoading: (loading) => set({ loading }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  setDepartureDetail: (departureDetail) => set({ departureDetail }),
  loadDepartureDetail: async (departureNumber) => {
    if (get().departureDetail?.departure_number === departureNumber) return
    set({ detailLoading: true, detailError: null })
    try {
      set({ departureDetail: await getDepartureDetail(departureNumber) })
    } catch (e) {
      set({ detailError: e instanceof Error ? e.message : 'Failed to load departure' })
    } finally {
      set({ detailLoading: false })
    }
  },
  clearDepartures: () => set({ departures: [] })
}))

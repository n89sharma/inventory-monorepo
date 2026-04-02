import {
  createDeparture,
  getDepartureDetail,
  getDepartureForUpdate,
  getDepartures,
  updateDeparture
} from '@/data/api/departure-api'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import type { ApiResponse, DepartureDetail, DepartureSummary, Warehouse } from 'shared-types'
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
  departureFormData: DepartureForm | null

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setOrigin: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  getDepartureDetails: (departureNumber: string) => Promise<void>
  getDepartures: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    origin: SelectOption<Warehouse>) => Promise<void>
  getDepartureForUpdate: (departureNumber: string) => Promise<void>
  submitCreateDeparture: (data: DepartureForm) => Promise<ApiResponse<{ departureNumber: string }>>
  submitUpdateDeparture: (departureNumber: string, data: DepartureForm) => Promise<ApiResponse<{ departureNumber: string }>>
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
  departureFormData: null,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setLoading: (loading) => set({ loading }),
  setHasSearched: (hasSearched) => set({ hasSearched }),

  getDepartures: async (fromDate, toDate, origin) => {
    set({ hasSearched: true, departures: await getDepartures(fromDate, toDate, origin) })
  },
  getDepartureDetails: async (departureNumber) => {
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
  getDepartureForUpdate: async (departureNumber) => {
    set({ departureFormData: null })
    set({ departureFormData: await getDepartureForUpdate(departureNumber) })
  },

  submitCreateDeparture: (data) => createDeparture(data),
  submitUpdateDeparture: (departureNumber, data) => {
    set({ departureDetail: null })
    return updateDeparture(departureNumber, data)
  },

  clearDepartures: () => set({ departures: [] })
}))

import {
  createDeparture,
  getDepartureDetail,
  getDepartureForUpdate,
  getDepartures,
  updateDeparture
} from '@/data/api/departure-api'
import { produce } from 'immer'
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
  detailLoading: boolean
  detailError: string | null
  departureFormData: DepartureForm | null
  departureDetailCache: Record<string, DepartureDetail>

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
  detailLoading: false,
  detailError: null,
  departureFormData: null,
  departureDetailCache: {},

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setLoading: (loading) => set({ loading }),
  setHasSearched: (hasSearched) => set({ hasSearched }),

  getDepartures: async (fromDate, toDate, origin) => {
    set({ hasSearched: true, departures: await getDepartures(fromDate, toDate, origin) })
  },
  getDepartureDetails: async (departureNumber) => {
    if (get().departureDetailCache[departureNumber]) return
    set({ detailLoading: true, detailError: null })
    try {
      const detail = await getDepartureDetail(departureNumber)
      set(produce(draft => { draft.departureDetailCache[departureNumber] = detail }))
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

  submitCreateDeparture: async (data) => {
    const response = await createDeparture(data)
    set({ hasSearched: false })
    return response
  },
  submitUpdateDeparture: (departureNumber, data) => {
    set(produce(draft => { delete draft.departureDetailCache[departureNumber] }))
    return updateDeparture(departureNumber, data)
  },

  clearDepartures: () => set({ departures: [] })
}))

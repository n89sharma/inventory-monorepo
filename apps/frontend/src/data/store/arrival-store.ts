import { createArrival, getArrivalDetail, getArrivalForUpdate, getArrivals, updateArrival } from '@/data/api/arrival-api'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { ApiResponse, ArrivalDetail, ArrivalSummary, Warehouse } from 'shared-types'
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
  arrivalFormData: ArrivalForm | null

  setArrivals: (arrivals: ArrivalSummary[]) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setDestination: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  setArrivalDetail: (arrivalDetail: ArrivalDetail) => void
  getArrivalDetail: (arrivalNumber: string) => Promise<void>
  getArrivals: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    destination: SelectOption<Warehouse>) => Promise<void>
  getArrivalForUpdate: (arrivalNumber: string) => Promise<void>
  submitCreateArrival: (data: ArrivalForm) => Promise<ApiResponse<{ arrivalNumber: string }>>
  submitUpdateArrival: (arrivalNumber: string, data: ArrivalForm) => Promise<ApiResponse<void>>

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
  arrivalFormData: null,

  setArrivals: (arrivals) => set({ arrivals }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setDestination: (warehouse) => set({ destination: warehouse }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  setArrivalDetail: (arrivalDetail) => set({ arrivalDetail }),

  getArrivals: async (fromDate, toDate, destination) => {
    set({ hasSearched: true, arrivals: await getArrivals(fromDate, toDate, destination) })
  },
  getArrivalForUpdate: async (arrivalNumber) => {
    set({ arrivalFormData: null })
    set({ arrivalFormData: await getArrivalForUpdate(arrivalNumber) })
  },
  getArrivalDetail: async (arrivalNumber) => {
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

  submitCreateArrival: async (data: ArrivalForm) => {
    const response = await createArrival(data)
    set({ hasSearched: false })
    return response
  },
  submitUpdateArrival: (arrivalNumber, data) => {
    set({ arrivalDetail: null })
    return updateArrival(arrivalNumber, data)
  },

  clearArrivals: () => set({ arrivals: [] })
}))

import { createArrival, getArrivalForUpdate, getArrivals, updateArrival } from '@/data/api/arrival-api'
import type { ArrivalForm } from '@/ui-types/arrival-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { ApiResponse, ArrivalSummary, Warehouse } from 'shared-types'
import { arrivalDetailKey } from '@/hooks/use-arrival-detail'
import { mutate } from 'swr'
import { create } from 'zustand'

interface ArrivalStore {
  arrivals: ArrivalSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  destination: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean
  arrivalFormData: ArrivalForm | null

  setArrivals: (arrivals: ArrivalSummary[]) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setDestination: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  getArrivals: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    destination: SelectOption<Warehouse>) => Promise<void>
  getArrivalForUpdate: (arrivalNumber: string) => Promise<void>
  submitCreateArrival: (data: ArrivalForm) => Promise<ApiResponse<{ arrivalNumber: string }>>
  submitUpdateArrival: (arrivalNumber: string, data: ArrivalForm) => Promise<ApiResponse<void>>
  clearArrivals: () => void
}

export const useArrivalStore = create<ArrivalStore>((set) => ({
  arrivals: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  destination: ANY_OPTION,
  hasSearched: false,
  arrivalFormData: null,

  setArrivals: (arrivals) => set({ arrivals }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setDestination: (warehouse) => set({ destination: warehouse }),
  setHasSearched: (hasSearched) => set({ hasSearched }),

  getArrivals: async (fromDate, toDate, destination) => {
    set({ hasSearched: true, arrivals: await getArrivals(fromDate, toDate, destination) })
  },
  getArrivalForUpdate: async (arrivalNumber) => {
    set({ arrivalFormData: null })
    set({ arrivalFormData: await getArrivalForUpdate(arrivalNumber) })
  },
  submitCreateArrival: async (data: ArrivalForm) => {
    const response = await createArrival(data)
    set({ hasSearched: false })
    return response
  },
  submitUpdateArrival: async (arrivalNumber, data) => {
    const response = await updateArrival(arrivalNumber, data)
    if (response.success) mutate(arrivalDetailKey(arrivalNumber))
    return response
  },

  clearArrivals: () => set({ arrivals: [] })
}))

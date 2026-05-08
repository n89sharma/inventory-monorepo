import { createDeparture, getDepartureForUpdate, getDepartures, updateDeparture } from '@/data/api/departure-api'
import { departureDetailKey } from '@/hooks/use-departure-detail'
import { mergeAssets } from '@/lib/collection-utils'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import type { ApiResponse, AssetSummary, DepartureSummary, Warehouse } from 'shared-types'
import { mutate } from 'swr'
import { create } from 'zustand'

interface DepartureStore {
  departures: DepartureSummary[]
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  origin: SelectOption<Warehouse>
  loading: boolean
  hasSearched: boolean
  departureFormData: DepartureForm | null

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setOrigin: (warehouse: SelectOption<Warehouse>) => void
  setLoading: (loading: boolean) => void
  setHasSearched: (hasSearched: boolean) => void
  getDepartures: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    origin: SelectOption<Warehouse>) => Promise<void>
  getDepartureForUpdate: (departureNumber: string) => Promise<void>
  submitCreateDeparture: (data: DepartureForm) => Promise<ApiResponse<{ departureNumber: string }>>
  submitUpdateDeparture: (departureNumber: string, data: DepartureForm) => Promise<ApiResponse<{ departureNumber: string }>>
  addAssets: (departureNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  clearDepartures: () => void
}

export const useDepartureStore = create<DepartureStore>((set) => ({
  departures: [],
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  origin: ANY_OPTION,
  loading: false,
  hasSearched: false,
  departureFormData: null,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setOrigin: (origin) => set({ origin }),
  setLoading: (loading) => set({ loading }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  getDepartures: async (fromDate, toDate, origin) => {
    set({ hasSearched: true, departures: await getDepartures(fromDate, toDate, origin) })
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
  submitUpdateDeparture: async (departureNumber, data) => {
    const response = await updateDeparture(departureNumber, data)
    if (response.success) mutate(departureDetailKey(departureNumber))
    return response
  },
  addAssets: async (departureNumber, assets) => {
    const form = await getDepartureForUpdate(departureNumber)
    if (!form) throw new Error(`Departure ${departureNumber} not found`)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    const response = await updateDeparture(departureNumber, { ...form, assets: merged })
    if (!response.success) throw new Error(response.error.summary)
    mutate(departureDetailKey(departureNumber))
    return { added, skipped }
  },
  clearDepartures: () => set({ departures: [] })
}))

import { createDeparture, getDepartureForUpdate, getDepartures, updateDeparture } from '@/data/api/departure-api'
import { departureDetailKey } from '@/hooks/use-departure-detail'
import { mergeAssets } from '@/lib/collection-utils'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { DepartureForm } from '@/ui-types/departure-form-types'
import type { AssetSummary, DepartureSummary, Warehouse } from 'shared-types'
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
  submitCreateDeparture: (data: DepartureForm) => Promise<{ departureNumber: string }>
  submitUpdateDeparture: (departureNumber: string, data: DepartureForm) => Promise<void>
  addAssets: (departureNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  getAssets: (departureNumber: string) => Promise<AssetSummary[]>
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
    const result = await createDeparture(data)
    set({ hasSearched: false })
    return result
  },
  submitUpdateDeparture: async (departureNumber, data) => {
    await updateDeparture(departureNumber, data)
    mutate(departureDetailKey(departureNumber))
  },
  addAssets: async (departureNumber, assets) => {
    const form = await getDepartureForUpdate(departureNumber)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    await updateDeparture(departureNumber, { ...form, assets: merged })
    mutate(departureDetailKey(departureNumber))
    return { added, skipped }
  },
  getAssets: async (departureNumber) => {
    const form = await getDepartureForUpdate(departureNumber)
    return form?.assets ?? []
  },
  clearDepartures: () => set({ departures: [] })
}))

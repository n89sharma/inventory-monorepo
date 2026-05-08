import { createHold, getHoldForUpdate, getHolds, updateHold } from '@/data/api/hold-api'
import { holdDetailKey } from '@/hooks/use-hold-detail'
import { mergeAssets } from '@/lib/collection-utils'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { ApiResponse, AssetSummary, HoldSummary, User } from 'shared-types'
import { mutate } from 'swr'
import { create } from 'zustand'

interface HoldStore {
  holds: HoldSummary[]
  loading: boolean
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  holdBy: SelectOption<User>
  holdFor: SelectOption<User>
  hasSearched: boolean
  holdFormData: HoldForm | null

  setHolds: (holds: HoldSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHoldBy: (v: SelectOption<User>) => void
  setHoldFor: (v: SelectOption<User>) => void
  setHasSearched: (hasSearched: boolean) => void
  getHolds: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    holdBy: SelectOption<User>,
    holdFor: SelectOption<User>) => Promise<void>
  getHoldForUpdate: (holdNumber: string) => Promise<void>
  submitCreateHold: (data: HoldForm) => Promise<ApiResponse<{ holdNumber: string }>>
  submitUpdateHold: (holdNumber: string, data: HoldForm) => Promise<ApiResponse<{ holdNumber: string }>>
  addAssets: (holdNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  clearHolds: () => void
}

export const useHoldStore = create<HoldStore>((set) => ({
  holds: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  holdBy: ANY_OPTION,
  holdFor: ANY_OPTION,
  hasSearched: false,
  holdFormData: null,

  setHolds: (holds) => set({ holds }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHoldBy: (holdBy) => set({ holdBy }),
  setHoldFor: (holdFor) => set({ holdFor }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  getHolds: async (fromDate, toDate, holdBy, holdFor) => {
    set({ hasSearched: true, holds: await getHolds(fromDate, toDate, holdBy, holdFor) })
  },
  getHoldForUpdate: async (holdNumber) => {
    set({ holdFormData: null })
    set({ holdFormData: await getHoldForUpdate(holdNumber) })
  },
  submitCreateHold: async (data) => {
    const response = await createHold(data)
    set({ hasSearched: false })
    return response
  },
  submitUpdateHold: async (holdNumber, data) => {
    const response = await updateHold(holdNumber, data)
    if (response.success) mutate(holdDetailKey(holdNumber))
    return response
  },
  addAssets: async (holdNumber, assets) => {
    const form = await getHoldForUpdate(holdNumber)
    if (!form) throw new Error(`Hold ${holdNumber} not found`)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    const response = await updateHold(holdNumber, { ...form, assets: merged })
    if (!response.success) throw new Error(response.error.summary)
    mutate(holdDetailKey(holdNumber))
    return { added, skipped }
  },
  clearHolds: () => set({ holds: [] })
}))

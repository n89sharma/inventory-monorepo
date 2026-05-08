import { createHold, getHoldForUpdate, getHolds, updateHold } from '@/data/api/hold-api'
import { holdDetailKey } from '@/hooks/use-hold-detail'
import { mergeAssets } from '@/lib/collection-utils'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { AssetSummary, HoldSummary, User } from 'shared-types'
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
  submitCreateHold: (data: HoldForm) => Promise<{ holdNumber: string }>
  submitUpdateHold: (holdNumber: string, data: HoldForm) => Promise<{ holdNumber: string }>
  addAssets: (holdNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  getAssets: (holdNumber: string) => Promise<AssetSummary[]>
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
    const result = await createHold(data)
    set({ hasSearched: false })
    return result
  },
  submitUpdateHold: async (holdNumber, data) => {
    const result = await updateHold(holdNumber, data)
    mutate(holdDetailKey(holdNumber))
    return result
  },
  addAssets: async (holdNumber, assets) => {
    const form = await getHoldForUpdate(holdNumber)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    await updateHold(holdNumber, { ...form, assets: merged })
    mutate(holdDetailKey(holdNumber))
    return { added, skipped }
  },
  getAssets: async (holdNumber) => {
    const form = await getHoldForUpdate(holdNumber)
    return form?.assets ?? []
  },
  clearHolds: () => set({ holds: [] })
}))

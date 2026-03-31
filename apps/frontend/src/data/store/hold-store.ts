import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { getHoldDetail } from '@/data/api/hold-api'
import type { HoldDetail, HoldSummary, User } from 'shared-types'
import { create } from 'zustand'

interface HoldStore {
  holds: HoldSummary[]
  loading: boolean
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  holdBy: SelectOption<User>
  holdFor: SelectOption<User>
  hasSearched: boolean
  holdDetail: HoldDetail | null
  detailLoading: boolean
  detailError: string | null

  setHolds: (holds: HoldSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHoldBy: (v: SelectOption<User>) => void
  setHoldFor: (v: SelectOption<User>) => void
  setHasSearched: (hasSearched: boolean) => void
  setHoldDetail: (holdDetail: HoldDetail) => void
  loadHoldDetail: (holdNumber: string) => Promise<void>

  clearHolds: () => void
}

export const useHoldStore = create<HoldStore>((set, get) => ({
  holds: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  holdBy: ANY_OPTION,
  holdFor: ANY_OPTION,
  hasSearched: false,
  holdDetail: null,
  detailLoading: false,
  detailError: null,

  setHolds: (holds) => set({ holds }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHoldBy: (holdBy) => set({ holdBy }),
  setHoldFor: (holdFor) => set({ holdFor }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  setHoldDetail: (holdDetail) => set({ holdDetail }),
  loadHoldDetail: async (holdNumber) => {
    if (get().holdDetail?.hold_number === holdNumber) return
    set({ detailLoading: true, detailError: null })
    try {
      set({ holdDetail: await getHoldDetail(holdNumber) })
    } catch (e) {
      set({ detailError: e instanceof Error ? e.message : 'Failed to load hold' })
    } finally {
      set({ detailLoading: false })
    }
  },
  clearHolds: () => set({ holds: [] })
}))

import { createHold, getHoldDetail, getHoldForUpdate, getHolds, updateHold } from '@/data/api/hold-api'
import type { HoldForm } from '@/ui-types/hold-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { ApiResponse, HoldDetail, HoldSummary, User } from 'shared-types'
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
  holdFormData: HoldForm | null
  detailCache: Record<string, HoldDetail>

  setHolds: (holds: HoldSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHoldBy: (v: SelectOption<User>) => void
  setHoldFor: (v: SelectOption<User>) => void
  setHasSearched: (hasSearched: boolean) => void
  setHoldDetail: (holdDetail: HoldDetail) => void
  getHoldDetails: (holdNumber: string) => Promise<void>
  prefetchHoldDetail: (holdNumber: string) => Promise<void>
  getHolds: (
    fromDate: SelectOption<Date>,
    toDate: SelectOption<Date>,
    holdBy: SelectOption<User>,
    holdFor: SelectOption<User>) => Promise<void>

  getHoldForUpdate: (holdNumber: string) => Promise<void>
  submitCreateHold: (data: HoldForm) => Promise<ApiResponse<{ holdNumber: string }>>
  submitUpdateHold: (holdNumber: string, data: HoldForm) => Promise<ApiResponse<{ holdNumber: string }>>
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
  holdFormData: null,
  detailCache: {},

  setHolds: (holds) => set({ holds }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHoldBy: (holdBy) => set({ holdBy }),
  setHoldFor: (holdFor) => set({ holdFor }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  setHoldDetail: (holdDetail) => set({ holdDetail }),
  getHolds: async (fromDate, toDate, holdBy, holdFor) => {
    set({ hasSearched: true, holds: await getHolds(fromDate, toDate, holdBy, holdFor) })
  },
  getHoldDetails: async (holdNumber) => {
    const cached = get().detailCache[holdNumber]
    if (cached) {
      set({ holdDetail: cached })
      return
    }
    set({ detailLoading: true, detailError: null })
    const res = await getHoldDetail(holdNumber)
    if (res.success) {
      set({ holdDetail: res.data, detailLoading: false })
    } else {
      set({ detailError: res.error.summary, detailLoading: false })
    }
  },
  prefetchHoldDetail: async (holdNumber) => {
    if (get().detailCache[holdNumber]) return
    try {
      const res = await getHoldDetail(holdNumber)
      if (res.success) {
        set(s => ({ detailCache: { ...s.detailCache, [holdNumber]: res.data } }))
      }
    } catch {
      // silently swallow — detail page will fetch normally on navigation
    }
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
  submitUpdateHold: (holdNumber, data) => {
    set(s => {
      const { [holdNumber]: _, ...rest } = s.detailCache
      return { holdDetail: null, detailCache: rest }
    })
    return updateHold(holdNumber, data)
  },
  clearHolds: () => set({ holds: [] })
}))

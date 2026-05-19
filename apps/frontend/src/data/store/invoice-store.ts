import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { create } from 'zustand'

interface InvoiceStore {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  hasSearched: boolean

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHasSearched: (hasSearched: boolean) => void
}

export const useInvoiceStore = create<InvoiceStore>((set) => ({
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  hasSearched: false,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
}))

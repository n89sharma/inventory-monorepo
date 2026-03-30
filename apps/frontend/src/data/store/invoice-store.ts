import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { Invoice } from 'shared-types'
import { create } from 'zustand'

interface InvoiceStore {
  invoices: Invoice[]
  loading: boolean
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  hasSearched: boolean

  setInvoices: (invoices: Invoice[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHasSearched: (hasSearched: boolean) => void

  clearInvoices: () => void
}

export const useInvoiceStore = create<InvoiceStore>((set) => ({
  invoices: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  hasSearched: false,

  setInvoices: (invoices) => set({ invoices }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  clearInvoices: () => set({ invoices: [] })
}))

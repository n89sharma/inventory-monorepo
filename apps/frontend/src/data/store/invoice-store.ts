import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import { INVOICE_TYPE } from 'shared-types'
import { create } from 'zustand'

export type InvoiceTypeFilter = typeof INVOICE_TYPE.purchase | typeof INVOICE_TYPE.sales

interface InvoiceStore {
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  invoiceType: InvoiceTypeFilter
  hasSearched: boolean

  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setInvoiceType: (invoiceType: InvoiceTypeFilter) => void
  setHasSearched: (hasSearched: boolean) => void
}

export const useInvoiceStore = create<InvoiceStore>((set) => ({
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  invoiceType: INVOICE_TYPE.purchase,
  hasSearched: false,

  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setInvoiceType: (invoiceType) => set({ invoiceType }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
}))

import { getInvoiceDetail, getInvoices } from '@/data/api/invoice-api'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { InvoiceDetail, InvoiceSummary } from 'shared-types'
import { create } from 'zustand'

interface InvoiceStore {
  invoices: InvoiceSummary[]
  loading: boolean
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  hasSearched: boolean
  invoiceDetail: InvoiceDetail | null
  detailLoading: boolean
  detailError: string | null

  setInvoices: (invoices: InvoiceSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHasSearched: (hasSearched: boolean) => void
  setInvoiceDetail: (invoiceDetail: InvoiceDetail) => void
  getInvoiceDetails: (invoiceNumber: string) => Promise<void>
  getInvoices: (fromDate: SelectOption<Date>, toDate: SelectOption<Date>) => Promise<void>

  clearInvoices: () => void
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  hasSearched: false,
  invoiceDetail: null,
  detailLoading: false,
  detailError: null,

  setInvoices: (invoices) => set({ invoices }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  setInvoiceDetail: (invoiceDetail) => set({ invoiceDetail }),
  getInvoices: async (fromDate, toDate) => {
    set({ hasSearched: true, invoices: await getInvoices(fromDate, toDate) })
  },
  getInvoiceDetails: async (invoiceNumber) => {
    if (get().invoiceDetail?.invoice_number === invoiceNumber) return
    set({ detailLoading: true, detailError: null })
    try {
      set({ invoiceDetail: await getInvoiceDetail(invoiceNumber) })
    } catch (e) {
      set({ detailError: e instanceof Error ? e.message : 'Failed to load invoice' })
    } finally {
      set({ detailLoading: false })
    }
  },
  clearInvoices: () => set({ invoices: [] })
}))

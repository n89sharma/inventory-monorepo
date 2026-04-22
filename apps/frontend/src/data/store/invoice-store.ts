import { createInvoice, getInvoiceDetail, getInvoiceForUpdate, getInvoices, updateInvoice } from '@/data/api/invoice-api'
import { produce } from 'immer'
import type { InvoiceEditForm, InvoiceForm } from '@/ui-types/invoice-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { ApiResponse, InvoiceDetail, InvoiceSummary } from 'shared-types'
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
  invoiceEditFormData: InvoiceEditForm | null
  detailCache: Record<string, InvoiceDetail>

  setInvoices: (invoices: InvoiceSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHasSearched: (hasSearched: boolean) => void
  setInvoiceDetail: (invoiceDetail: InvoiceDetail) => void
  getInvoiceDetails: (invoiceNumber: string) => Promise<void>
  prefetchInvoiceDetail: (invoiceNumber: string) => Promise<void>
  getInvoices: (fromDate: SelectOption<Date>, toDate: SelectOption<Date>) => Promise<void>
  submitCreateInvoice: (data: InvoiceForm) => Promise<ApiResponse<{ invoiceNumber: string }>>
  getInvoiceForUpdate: (invoiceNumber: string) => Promise<void>
  submitUpdateInvoice: (invoiceNumber: string, data: InvoiceEditForm) => Promise<ApiResponse<{ invoiceNumber: string }>>

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
  invoiceEditFormData: null,
  detailCache: {},

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
    const cached = get().detailCache[invoiceNumber]
    if (cached) {
      set({ invoiceDetail: cached })
      return
    }
    set({ detailLoading: true, detailError: null })
    try {
      set({ invoiceDetail: await getInvoiceDetail(invoiceNumber) })
    } catch (e) {
      set({ detailError: e instanceof Error ? e.message : 'Failed to load invoice' })
    } finally {
      set({ detailLoading: false })
    }
  },
  prefetchInvoiceDetail: async (invoiceNumber) => {
    if (get().detailCache[invoiceNumber]) return
    try {
      const detail = await getInvoiceDetail(invoiceNumber)
      set(produce(draft => { draft.detailCache[invoiceNumber] = detail }))
    } catch {
      // silently swallow — detail page will fetch normally on navigation
    }
  },
  submitCreateInvoice: async (data) => {
    const response = await createInvoice(data)
    set({ hasSearched: false })
    return response
  },
  getInvoiceForUpdate: async (invoiceNumber) => {
    set({ invoiceEditFormData: null })
    set({ invoiceEditFormData: await getInvoiceForUpdate(invoiceNumber) })
  },
  submitUpdateInvoice: (invoiceNumber, data) => {
    set(produce(draft => {
      delete draft.detailCache[invoiceNumber]
      draft.invoiceDetail = null
    }))
    return updateInvoice(invoiceNumber, data)
  },
  clearInvoices: () => set({ invoices: [] })
}))

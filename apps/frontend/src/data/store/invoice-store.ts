import { createInvoice, getInvoiceForUpdate, getInvoices, updateInvoice } from '@/data/api/invoice-api'
import { invoiceDetailKey } from '@/hooks/use-invoice-detail'
import type { InvoiceEditForm, InvoiceForm } from '@/ui-types/invoice-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { ApiResponse, InvoiceSummary } from 'shared-types'
import { mutate } from 'swr'
import { create } from 'zustand'

interface InvoiceStore {
  invoices: InvoiceSummary[]
  loading: boolean
  fromDate: SelectOption<Date>
  toDate: SelectOption<Date>
  hasSearched: boolean
  invoiceEditFormData: InvoiceEditForm | null

  setInvoices: (invoices: InvoiceSummary[]) => void
  setLoading: (loading: boolean) => void
  setFromDate: (date: SelectOption<Date>) => void
  setToDate: (date: SelectOption<Date>) => void
  setHasSearched: (hasSearched: boolean) => void
  getInvoices: (fromDate: SelectOption<Date>, toDate: SelectOption<Date>) => Promise<void>
  submitCreateInvoice: (data: InvoiceForm) => Promise<ApiResponse<{ invoiceNumber: string }>>
  getInvoiceForUpdate: (invoiceNumber: string) => Promise<void>
  submitUpdateInvoice: (invoiceNumber: string, data: InvoiceEditForm) => Promise<ApiResponse<{ invoiceNumber: string }>>
  clearInvoices: () => void
}

export const useInvoiceStore = create<InvoiceStore>((set) => ({
  invoices: [],
  loading: false,
  fromDate: UNSELECTED,
  toDate: ANY_OPTION,
  hasSearched: false,
  invoiceEditFormData: null,

  setInvoices: (invoices) => set({ invoices }),
  setLoading: (loading) => set({ loading }),
  setFromDate: (fromDate) => set({ fromDate }),
  setToDate: (toDate) => set({ toDate }),
  setHasSearched: (hasSearched) => set({ hasSearched }),
  getInvoices: async (fromDate, toDate) => {
    set({ hasSearched: true, invoices: await getInvoices(fromDate, toDate) })
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
  submitUpdateInvoice: async (invoiceNumber, data) => {
    const response = await updateInvoice(invoiceNumber, data)
    if (response.success) mutate(invoiceDetailKey(invoiceNumber))
    return response
  },
  clearInvoices: () => set({ invoices: [] })
}))

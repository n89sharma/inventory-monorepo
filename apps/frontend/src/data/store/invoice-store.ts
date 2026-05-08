import { createInvoice, getInvoiceForUpdate, getInvoices, updateInvoice } from '@/data/api/invoice-api'
import { invoiceDetailKey } from '@/hooks/use-invoice-detail'
import { mergeAssets } from '@/lib/collection-utils'
import type { InvoiceEditForm, InvoiceForm } from '@/ui-types/invoice-form-types'
import { ANY_OPTION, type SelectOption, UNSELECTED } from '@/ui-types/select-option-types'
import type { AssetSummary, InvoiceSummary } from 'shared-types'
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
  submitCreateInvoice: (data: InvoiceForm) => Promise<{ invoiceNumber: string }>
  getInvoiceForUpdate: (invoiceNumber: string) => Promise<void>
  submitUpdateInvoice: (invoiceNumber: string, data: InvoiceEditForm) => Promise<{ invoiceNumber: string }>
  addAssets: (invoiceNumber: string, assets: AssetSummary[]) => Promise<{ added: number; skipped: number }>
  getAssets: (invoiceNumber: string) => Promise<AssetSummary[]>
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
    const result = await createInvoice(data)
    set({ hasSearched: false })
    return result
  },
  getInvoiceForUpdate: async (invoiceNumber) => {
    set({ invoiceEditFormData: null })
    set({ invoiceEditFormData: await getInvoiceForUpdate(invoiceNumber) })
  },
  submitUpdateInvoice: async (invoiceNumber, data) => {
    const result = await updateInvoice(invoiceNumber, data)
    mutate(invoiceDetailKey(invoiceNumber))
    return result
  },
  addAssets: async (invoiceNumber, assets) => {
    const form = await getInvoiceForUpdate(invoiceNumber)
    const { merged, added, skipped } = mergeAssets(form.assets, assets)
    await updateInvoice(invoiceNumber, { ...form, assets: merged })
    mutate(invoiceDetailKey(invoiceNumber))
    return { added, skipped }
  },
  getAssets: async (invoiceNumber) => {
    const form = await getInvoiceForUpdate(invoiceNumber)
    return form?.assets ?? []
  },
  clearInvoices: () => set({ invoices: [] })
}))

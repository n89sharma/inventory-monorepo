import { getInvoiceDetail, getInvoices } from '@/data/api/invoice-api'
import type { InvoiceTypeFilter } from '@/ui-types/invoice-form-types'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getSelectedOrNull } from '@/ui-types/select-option-types'
import useSWR, { mutate, preload } from 'swr'

export const invoiceDetailKey = (invoiceNumber: string) => `invoice:${invoiceNumber}`

export function useInvoiceDetail(invoiceNumber: string) {
  return useSWR(invoiceDetailKey(invoiceNumber), () => getInvoiceDetail(invoiceNumber))
}

export function preloadInvoiceDetail(invoiceNumber: string) {
  preload(invoiceDetailKey(invoiceNumber), () => getInvoiceDetail(invoiceNumber))
}

const INVOICE_LIST_KEY_PREFIX = 'invoices:list'

type InvoiceListKey = readonly [
  typeof INVOICE_LIST_KEY_PREFIX,
  string | null,
  string | null,
  InvoiceTypeFilter,
]

function invoiceListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  invoiceType: InvoiceTypeFilter,
): InvoiceListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  const to = getSelectedOrNull(toDate)
  return [INVOICE_LIST_KEY_PREFIX, from.toISOString(), to?.toISOString() ?? null, invoiceType]
}

export function useInvoicesList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  invoiceType: InvoiceTypeFilter,
) {
  return useSWR(invoiceListKey(fromDate, toDate, invoiceType), () =>
    getInvoices(fromDate, toDate, invoiceType),
  )
}

export function invalidateInvoiceLists() {
  return mutate((key) => Array.isArray(key) && key[0] === INVOICE_LIST_KEY_PREFIX, undefined, {
    revalidate: true,
  })
}

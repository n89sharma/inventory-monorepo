import { getInvoices } from '@/data/api/invoice-api'
import type { SelectOption } from '@/ui-types/select-option-types'
import { getSelectedOrNull } from '@/ui-types/select-option-types'
import useSWR, { mutate } from 'swr'

const INVOICE_LIST_KEY_PREFIX = 'invoices:list'

type InvoiceListKey = readonly [
  typeof INVOICE_LIST_KEY_PREFIX,
  string | null,
  string | null,
]

function invoiceListKey(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>
): InvoiceListKey | null {
  const from = getSelectedOrNull(fromDate)
  if (from === null) return null
  const to = getSelectedOrNull(toDate)
  return [INVOICE_LIST_KEY_PREFIX, from.toISOString(), to?.toISOString() ?? null]
}

export function useInvoicesList(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>
) {
  return useSWR(
    invoiceListKey(fromDate, toDate),
    () => getInvoices(fromDate, toDate)
  )
}

export function invalidateInvoiceLists() {
  return mutate(
    key => Array.isArray(key) && key[0] === INVOICE_LIST_KEY_PREFIX,
    undefined,
    { revalidate: true }
  )
}

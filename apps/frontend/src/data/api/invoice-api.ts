import { api } from '@/data/api/axios-client'
import { getSelectedOrNull, type Invoice, InvoiceSchema, type SelectOption } from 'shared-types'
import { z } from 'zod'

export async function getInvoices(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>
): Promise<Invoice[]> {

  const res = await api.get(`/invoices`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate)
    }
  })
  return z.array(InvoiceSchema).parse(res.data)
}
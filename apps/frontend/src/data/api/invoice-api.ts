import { api } from '@/data/api/axios-client'
import { getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { ApiResponse, InvoiceDetail } from 'shared-types'
import { type Invoice, InvoiceDetailSchema, InvoiceSchema } from 'shared-types'
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

export async function getInvoiceDetail(invoiceNumber: string): Promise<InvoiceDetail> {
  const { data } = await api.get<ApiResponse<InvoiceDetail>>(`/invoices/${invoiceNumber}`)
  if (data.success) return InvoiceDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}

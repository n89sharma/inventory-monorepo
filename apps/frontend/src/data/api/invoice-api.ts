import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { InvoiceForm } from '@/ui-types/invoice-form-types'
import { getIdOrNullFromSelection, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { ApiResponse, InvoiceDetail } from 'shared-types'
import { type InvoiceSummary, InvoiceDetailSchema, InvoiceSummarySchema } from 'shared-types'
import type { AxiosResponse } from 'axios'
import { z } from 'zod'

interface CreateInvoiceResponse {
  invoiceNumber: string
}

export async function createInvoice(d: InvoiceForm): Promise<ApiResponse<CreateInvoiceResponse>> {
  return api.post(
    '/invoices',
    {
      invoice_number: d.invoice_number,
      organization_id: d.organization!.id,
      invoice_type_id: getIdOrNullFromSelection(d.invoice_type),
      is_cleared: d.is_cleared
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
    .then((response: AxiosResponse<CreateInvoiceResponse>) => ({
      success: true as const,
      data: response.data
    }))
    .catch(apiErrorHandler<CreateInvoiceResponse>)
}

export async function getInvoices(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>
): Promise<InvoiceSummary[]> {

  const { data } = await api.get<ApiResponse<InvoiceSummary[]>>(`/invoices`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate)
    }
  })
  if (data.success) return z.array(InvoiceSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function getInvoiceDetail(invoiceNumber: string): Promise<InvoiceDetail> {
  const { data } = await api.get<ApiResponse<InvoiceDetail>>(`/invoices/${invoiceNumber}`)
  if (data.success) return InvoiceDetailSchema.parse(data.data)
  throw new Error(data.error.summary)
}

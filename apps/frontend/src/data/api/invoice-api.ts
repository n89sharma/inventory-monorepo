import { api } from '@/data/api/axios-client'
import type { InvoiceEditForm, InvoiceForm } from '@/ui-types/invoice-form-types'
import { getIdOrNullFromSelection, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { CollectionHistory, CreateInvoice, InvoiceDetail, UpdateInvoice } from 'shared-types'
import { CollectionHistorySchema, CreateInvoiceSchema, InvoiceDetailSchema, InvoiceSummarySchema, SubmitUpdateInvoiceSchema, UpdateInvoiceSchema, type InvoiceSummary } from 'shared-types'
import { z } from 'zod'

const CreateInvoiceResponseSchema = z.object({ invoiceNumber: z.string() })
type CreateInvoiceResponse = z.infer<typeof CreateInvoiceResponseSchema>

const UpdateInvoiceResponseSchema = z.object({ invoiceNumber: z.string() })

export async function createInvoice(d: InvoiceForm): Promise<CreateInvoiceResponse> {
  const createInvoiceBody = CreateInvoiceSchema.parse({
    invoice_number: d.invoice_number,
    organization_id: d.organization!.id,
    invoice_type_id: getIdOrNullFromSelection(d.invoice_type)!,
    is_cleared: d.is_cleared,
    assets: d.assets as CreateInvoice['assets']
  } satisfies CreateInvoice)
  const { data } = await api.post<CreateInvoiceResponse>('/invoices', createInvoiceBody)
  return CreateInvoiceResponseSchema.parse(data)
}

export async function getInvoices(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>
): Promise<InvoiceSummary[]> {
  const { data } = await api.get<InvoiceSummary[]>(`/invoices`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate)
    }
  })
  return z.array(InvoiceSummarySchema).parse(data)
}

export async function getInvoiceForUpdate(invoiceNumber: string): Promise<InvoiceEditForm> {
  const { data } = await api.get<UpdateInvoice>(`/invoices/${invoiceNumber}/edit`)
  return mapUpdateInvoiceToEditForm(UpdateInvoiceSchema.parse(data))
}

export function mapUpdateInvoiceToEditForm(invoice: UpdateInvoice): InvoiceEditForm {
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    organization: invoice.organization,
    invoice_type: invoice.invoice_type,
    is_cleared: invoice.is_cleared,
    assets: invoice.assets
  }
}

export async function updateInvoice(
  invoiceNumber: string,
  d: InvoiceEditForm
): Promise<{ invoiceNumber: string }> {
  const updateInvoiceBody = SubmitUpdateInvoiceSchema.parse({
    id: d.id,
    invoice_number: d.invoice_number,
    organization: d.organization,
    invoice_type: d.invoice_type,
    is_cleared: d.is_cleared,
    assets: d.assets
  } satisfies UpdateInvoice)
  const { data } = await api.put<{ invoiceNumber: string }>(`/invoices/${invoiceNumber}`, updateInvoiceBody)
  return UpdateInvoiceResponseSchema.parse(data)
}

export async function getInvoiceDetail(invoiceNumber: string): Promise<InvoiceDetail> {
  const { data } = await api.get<InvoiceDetail>(`/invoices/${invoiceNumber}`)
  return InvoiceDetailSchema.parse(data)
}

export async function getInvoiceHistory(invoiceNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<CollectionHistory>(`/invoices/${invoiceNumber}/history`)
  return CollectionHistorySchema.parse(data)
}

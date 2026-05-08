import { api } from '@/data/api/axios-client'
import type { InvoiceEditForm, InvoiceForm } from '@/ui-types/invoice-form-types'
import { getIdOrNullFromSelection, getSelectedOrNull, type SelectOption } from '@/ui-types/select-option-types'
import type { CollectionHistory, InvoiceDetail, UpdateInvoice } from 'shared-types'
import { type InvoiceSummary, InvoiceDetailSchema, InvoiceSummarySchema, UpdateInvoiceSchema } from 'shared-types'
import { z } from 'zod'

interface CreateInvoiceResponse {
  invoiceNumber: string
}

export async function createInvoice(d: InvoiceForm): Promise<CreateInvoiceResponse> {
  return (await api.post<CreateInvoiceResponse>('/invoices', {
    invoice_number: d.invoice_number,
    organization_id: d.organization!.id,
    invoice_type_id: getIdOrNullFromSelection(d.invoice_type),
    is_cleared: d.is_cleared
  })).data
}

export async function getInvoices(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>
): Promise<InvoiceSummary[]> {
  const { data } = await api.get<{ success: true; data: InvoiceSummary[] }>(`/invoices`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate)
    }
  })
  return z.array(InvoiceSummarySchema).parse(data.data)
}

export async function getInvoiceForUpdate(invoiceNumber: string): Promise<InvoiceEditForm> {
  const { data } = await api.get<{ success: true; data: UpdateInvoice }>(`/invoices/${invoiceNumber}/edit`)
  return mapUpdateInvoiceToEditForm(UpdateInvoiceSchema.parse(data.data))
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
  return (await api.put<{ invoiceNumber: string }>(`/invoices/${invoiceNumber}`, {
    id: d.id,
    invoice_number: d.invoice_number,
    organization: d.organization,
    invoice_type: d.invoice_type,
    is_cleared: d.is_cleared,
    assets: d.assets
  })).data
}

export async function getInvoiceDetail(invoiceNumber: string): Promise<InvoiceDetail> {
  const { data } = await api.get<{ success: true; data: InvoiceDetail }>(`/invoices/${invoiceNumber}`)
  return InvoiceDetailSchema.parse(data.data)
}

export async function getInvoiceHistory(invoiceNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<{ success: true; data: CollectionHistory }>(`/invoices/${invoiceNumber}/history`)
  return data.data
}

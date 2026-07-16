import { api } from '@/data/api/axios-client'
import type { InvoiceTypeFilter } from '@/data/store/invoice-store'
import type { InvoiceForm, InvoiceMetadataForm } from '@/ui-types/invoice-form-types'
import {
  getIdOrNullFromSelection,
  getSelectedOrNull,
  type SelectOption,
} from '@/ui-types/select-option-types'
import type {
  AssetDelta,
  CollectionHistory,
  CreateInvoice,
  InvoiceDetail,
  UpdateInvoiceMetadata,
} from 'shared-types'
import {
  AssetDeltaSchema,
  CollectionHistorySchema,
  CreateInvoiceSchema,
  InvoiceDetailSchema,
  InvoiceSummarySchema,
  UpdateInvoiceMetadataSchema,
  type InvoiceSummary,
} from 'shared-types'
import { z } from 'zod'

const CreateInvoiceResponseSchema = z.object({ invoiceNumber: z.string() })
type CreateInvoiceResponse = z.infer<typeof CreateInvoiceResponseSchema>

export async function createInvoice(d: InvoiceForm): Promise<CreateInvoiceResponse> {
  const createInvoiceBody = CreateInvoiceSchema.parse({
    invoice_reference: d.invoice_reference,
    organization_id: d.organization!.id,
    invoice_type_id: getIdOrNullFromSelection(d.invoice_type)!,
    is_cleared: d.is_cleared,
    comment: d.comment,
    assets: d.assets as CreateInvoice['assets'],
  } satisfies CreateInvoice)
  const { data } = await api.post<CreateInvoiceResponse>('/invoices', createInvoiceBody)
  return CreateInvoiceResponseSchema.parse(data)
}

export async function getInvoices(
  fromDate: SelectOption<Date>,
  toDate: SelectOption<Date>,
  invoiceType: InvoiceTypeFilter,
): Promise<InvoiceSummary[]> {
  const { data } = await api.get<InvoiceSummary[]>(`/invoices`, {
    params: {
      fromDate: getSelectedOrNull(fromDate),
      toDate: getSelectedOrNull(toDate),
      invoiceType,
    },
  })
  return z.array(InvoiceSummarySchema).parse(data)
}

export async function getInvoiceDetail(invoiceNumber: string): Promise<InvoiceDetail> {
  const { data } = await api.get<InvoiceDetail>(`/invoices/${invoiceNumber}`)
  return InvoiceDetailSchema.parse(data)
}

export async function getInvoiceHistory(invoiceNumber: string): Promise<CollectionHistory> {
  const { data } = await api.get<CollectionHistory>(`/invoices/${invoiceNumber}/history`)
  return CollectionHistorySchema.parse(data)
}

export async function updateInvoiceMetadata(
  invoiceNumber: string,
  metadata: InvoiceMetadataForm,
): Promise<void> {
  const updateInvoiceMetadataBody = UpdateInvoiceMetadataSchema.parse({
    organization: metadata.organization!,
    is_cleared: metadata.is_cleared,
    comment: metadata.comment === '' ? null : metadata.comment,
  } satisfies UpdateInvoiceMetadata)
  await api.patch(`/invoices/${invoiceNumber}/metadata`, updateInvoiceMetadataBody)
}

export async function patchInvoiceAssets(invoiceNumber: string, delta: AssetDelta): Promise<void> {
  const patchInvoiceAssetsBody = AssetDeltaSchema.parse(delta satisfies AssetDelta)
  await api.patch(`/invoices/${invoiceNumber}/assets`, patchInvoiceAssetsBody)
}

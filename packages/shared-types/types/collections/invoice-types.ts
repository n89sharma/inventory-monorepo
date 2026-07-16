import { z } from 'zod'
import { AssetSummarySchema } from '../asset-types.js'
import { OrgDetailSchema, OrgSummarySchema } from '../organization-types.js'
import { UserSchema } from '../user-types.js'
import { CollectionSummarySchema } from './collection-types.js'

export const InvoiceSummarySchema = CollectionSummarySchema.extend({
  invoice_number: z.string(),
  invoice_reference: z.string(),
  organization: z.string(),
  is_cleared: z.boolean(),
  invoice_type: z.string(),
})
export type InvoiceSummary = z.infer<typeof InvoiceSummarySchema>

export const InvoiceArrivalSchema = z.object({
  arrival_number: z.string(),
  transporter: z.string(),
  destination_code: z.string(),
})
export type InvoiceArrival = z.infer<typeof InvoiceArrivalSchema>

// GET /invoices/:invoiceNumber
export const InvoiceDetailSchema = z.object({
  invoice_number: z.string(),
  invoice_reference: z.string(),
  invoice_type: z.object({ id: z.number().int(), type: z.string() }),
  is_cleared: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: UserSchema,
  customer: OrgDetailSchema,
  assets: z.array(AssetSummarySchema),
  arrivals: z.array(InvoiceArrivalSchema),
})
export type InvoiceDetail = z.infer<typeof InvoiceDetailSchema>

export const CreateInvoiceSchema = z.object({
  invoice_reference: z.string().min(1),
  organization_id: z.number().int(),
  invoice_type_id: z.number().int(),
  is_cleared: z.boolean(),
  comment: z.string().nullable(),
  assets: z.array(AssetSummarySchema).nonempty('No assets in the invoice').max(2000),
})
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>

// PATCH /invoices/:invoiceNumber/metadata
export const UpdateInvoiceMetadataSchema = z.object({
  organization: OrgSummarySchema,
  is_cleared: z.boolean(),
  comment: z.string().nullable(),
})
export type UpdateInvoiceMetadata = z.infer<typeof UpdateInvoiceMetadataSchema>

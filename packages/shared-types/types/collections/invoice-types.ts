import { z } from 'zod';
import { AssetSummarySchema } from '../asset-types.js';
import { OrgDetailSchema, OrgSummarySchema } from '../organization-types.js';
import { UserSchema } from '../user-types.js';
import { CollectionSummarySchema } from './collection-types.js';

export const InvoiceSummarySchema = CollectionSummarySchema.extend({
  invoice_number: z.string(),
  organization: z.string(),
  is_cleared: z.boolean(),
  invoice_type: z.string()
})
export type InvoiceSummary = z.infer<typeof InvoiceSummarySchema>;

// GET /invoices/:invoiceNumber
export const InvoiceDetailSchema = z.object({
  invoice_number: z.string(),
  invoice_type: z.string(),
  is_cleared: z.boolean(),
  created_at: z.coerce.date(),
  created_by: UserSchema,
  customer: OrgDetailSchema,
  assets: z.array(AssetSummarySchema)
})
export type InvoiceDetail = z.infer<typeof InvoiceDetailSchema>

export const CreateInvoiceSchema = z.object({
  invoice_number: z.string().min(1),
  organization_id: z.number().int(),
  invoice_type_id: z.number().int(),
  is_cleared: z.boolean(),
  assets: z.array(AssetSummarySchema).nonempty('No assets in the invoice')
})
export type CreateInvoice = z.infer<typeof CreateInvoiceSchema>

// GET /invoices/:invoiceNumber/edit and PUT /invoices/:invoiceNumber
export const UpdateInvoiceSchema = z.object({
  id: z.number().int(),
  invoice_number: z.string(),
  organization: OrgSummarySchema,
  invoice_type: z.object({ id: z.number().int(), type: z.string() }),
  is_cleared: z.boolean(),
  assets: z.array(AssetSummarySchema).nonempty('No assets in the invoice')
})
export type UpdateInvoice = z.infer<typeof UpdateInvoiceSchema>

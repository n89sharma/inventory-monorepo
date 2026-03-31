import { z } from 'zod';
import { AssetSummarySchema } from './asset-types.js';
import { OrgDetailSchema } from './organization-types.js';
import { UserSchema } from './user-types.js';

export const InvoiceSchema = z.object({
  invoice_number: z.string(),
  organization: z.string(),
  created_by: z.string(),
  created_at: z.iso.datetime(),
  is_cleared: z.boolean(),
  invoice_type: z.string()
});

export type Invoice = z.infer<typeof InvoiceSchema>;

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

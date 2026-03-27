import { z } from 'zod';

export const InvoiceSchema = z.object({
  invoice_number: z.string(),
  organization: z.string(),
  created_by: z.string(),
  created_at: z.iso.datetime(),
  is_cleared: z.boolean(),
  invoice_type: z.string()
});

export type Invoice = z.infer<typeof InvoiceSchema>;

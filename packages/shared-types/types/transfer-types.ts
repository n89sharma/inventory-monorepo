import { z } from 'zod';
import { AssetSummarySchema } from './asset-types.js';
import { OrgDetailSchema } from './organization-types.js';
import { WarehouseSchema } from './reference-data-types.js';

export const TransferSchema = z.object({
  transfer_number: z.string(),
  origin_code: z.string(),
  origin_street: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  transporter: z.string(),
  created_at: z.coerce.date(),
  created_by: z.string()
});

export type Transfer = z.infer<typeof TransferSchema>;

// GET /transfers/:transferNumber
export const TransferDetailSchema = z.object({
  transfer_number: z.string(),
  origin: WarehouseSchema,
  destination: WarehouseSchema,
  transporter: OrgDetailSchema,
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  created_by: z.string().optional(),
  assets: z.array(AssetSummarySchema)
})
export type TransferDetail = z.infer<typeof TransferDetailSchema>

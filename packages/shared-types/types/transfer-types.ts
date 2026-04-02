import { z } from 'zod';
import { AssetSummarySchema } from './asset-types.js';
import { OrgDetailSchema, OrgSummarySchema } from './organization-types.js';
import { WarehouseSchema } from './reference-data-types.js';

// GET /transfers?fromDate...&toDate...&origin...&destination...
export const TransferSummarySchema = z.object({
  transfer_number: z.string(),
  origin_code: z.string(),
  origin_street: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  transporter: z.string(),
  created_at: z.coerce.date(),
  created_by: z.string()
})
export type TransferSummary = z.infer<typeof TransferSummarySchema>;

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

// POST /transfers
export const CreateTransferSchema = z.object({
  origin: WarehouseSchema.refine(val => !!val, "Origin required"),
  destination: WarehouseSchema.refine(val => !!val, "Destination required"),
  transporter: OrgSummarySchema.refine(val => !!val, "Transporter required"),
  comment: z.string().nullable(),
  assets: z.array(AssetSummarySchema).nonempty("No assets in the transfer")
}).refine(data => data.origin.id !== data.destination.id, {
  message: "Origin and destination cannot be the same",
  path: ["destination"]
})
export type CreateTransfer = z.infer<typeof CreateTransferSchema>

// GET /transfers/:transferNumber/edit
// PUT /transfers/:transferNumber
export const UpdateTransferSchema = z.object({
  id: z.number(),
  origin: WarehouseSchema.refine(val => !!val, "Origin required"),
  destination: WarehouseSchema.refine(val => !!val, "Destination required"),
  transporter: OrgSummarySchema.refine(val => !!val, "Transporter required"),
  comment: z.string().nullable(),
  assets: z.array(AssetSummarySchema).nonempty("No assets in the transfer")
}).refine(data => data.origin.id !== data.destination.id, {
  message: "Origin and destination cannot be the same",
  path: ["destination"]
})
export type UpdateTransfer = z.infer<typeof UpdateTransferSchema>

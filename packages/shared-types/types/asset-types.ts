import { z } from 'zod';


export const AssetLocationDetailsSchema = z.object({
  warehouse_code: z.string(),
  warehouse_street: z.string(),
  zone: z.string(),
  bin: z.string(),
})

export type AssetLocationDetails = z.infer<typeof AssetLocationDetailsSchema>

export const AssetSummarySchema = z.object({
  id: z.number(),
  barcode: z.string(),
  brand: z.string(),
  model: z.string(),
  asset_type: z.string(),
  serial_number: z.string(),
  meter_total: z.number().nullable(),
  status: z.string(),
  readiness: z.string(),
  location: AssetLocationDetailsSchema.nullable(),
  hold_number: z.string().nullable().optional(),
  purchase_invoice_id: z.number().nullable().optional()
})

export type AssetSummary = z.infer<typeof AssetSummarySchema>

export const AssetDetailsSchema = z.object({
  id: z.number(),
  barcode: z.string(),
  model: z.string(),
  brand: z.string(),
  asset_type: z.string(),
  serial_number: z.string(),
  status: z.string(),
  readiness: z.string(),
  location: AssetLocationDetailsSchema.nullable(),
  cost: z.object({
    purchase_cost: z.number().nullable(),
    transport_cost: z.number().nullable(),
    processing_cost: z.number().nullable(),
    other_cost: z.number().nullable(),
    parts_cost: z.number().nullable(),
    total_cost: z.number().nullable(),
    sale_price: z.number().nullable()
  }),
  specs: z.object({
    cassettes: z.number().nullable(),
    internal_finisher: z.string().nullable(),
    meter_black: z.number().nullable(),
    meter_colour: z.number().nullable(),
    meter_total: z.number().nullable(),
    drum_life_c: z.number().nullable(),
    drum_life_m: z.number().nullable(),
    drum_life_y: z.number().nullable(),
    drum_life_k: z.number().nullable()
  }),
  hold: z.object({
    created_by: z.string(),
    created_for: z.string(),
    created_at: z.coerce.date().nullable(),
    customer: z.string(),
    from_dt: z.coerce.date().nullable(),
    to_dt: z.coerce.date().nullable(),
    notes: z.string().nullable(),
    hold_number: z.string()
  }).nullable(),
  created_at: z.coerce.date(),
  arrival: z.object({
    arrival_number: z.string(),
    origin: z.string(),
    destination_code: z.string(),
    destination_street: z.string(),
    transporter: z.string(),
    created_by: z.string(),
    notes: z.string().nullable(),
    created_at: z.coerce.date()
  }).nullable(),
  departure: z.object({
    departure_number: z.string(),
    origin_code: z.string(),
    origin_street: z.string(),
    destination: z.string(),
    transporter: z.string(),
    created_by: z.string(),
    notes: z.string().nullable(),
    created_at: z.coerce.date()
  }).nullable(),
  purchase_invoice: z.object({
    invoice_number: z.string(),
    is_cleared: z.boolean()
  }).nullable()
})

export type AssetDetails = z.infer<typeof AssetDetailsSchema>

export const AssetErrorSchema = z.object({
  error_id: z.number(),
  brand_id: z.number(),
  code: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  is_fixed: z.boolean(),
  added_at: z.coerce.date().nullable(),
  added_by: z.string(),
  fixed_at: z.coerce.date().nullable(),
  fixed_by: z.string()
})

export type AssetError = z.infer<typeof AssetErrorSchema>

export const CommentSchema = z.object({
  comment: z.string(),
  username: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  initials: z.string()
})

export type Comment = z.infer<typeof CommentSchema>

export const AssetTransferSchema = z.object({
  created_at: z.coerce.date(),
  source_code: z.string(),
  source_stree: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  transfer_number: z.string(),
  transporter: z.string()
})

export type AssetTransfer = z.infer<typeof AssetTransferSchema>

export const PartTransferSchema = z.object({
  recipient: z.string(),
  donor: z.string(),
  fixed_at: z.coerce.date(),
  fixed_by: z.string(),
  notes: z.string().nullable(),
  part: z.string(),
  is_exchange: z.boolean()
})

export type PartTransfer = z.infer<typeof PartTransferSchema>

export const BarcodeSuggestionSchema = z.object({
  barcode: z.string(),
  serial_number: z.string(),
  asset_type: z.string(),
  model: z.string(),
})

export type BarcodeSuggestion = z.infer<typeof BarcodeSuggestionSchema>

export const UpdateErrorSchema = z.object({
  code: z.string(),
  is_fixed: z.boolean()
})

export const UpdateAssetErrorsSchema = z.object({
  errors: z.array(UpdateErrorSchema).max(100)
})

export type UpdateError = z.infer<typeof UpdateErrorSchema>
export type UpdateAssetErrors = z.infer<typeof UpdateAssetErrorsSchema>

export const CreatePartTransferSchema = z.object({
  donor_barcode: z.string().min(1, "Donor is required"),
  part: z.string().min(1, "Part is required"),
  is_exchange: z.boolean(),
  notes: z.string().optional()
})

export type CreatePartTransfer = z.infer<typeof CreatePartTransferSchema>

export const CreateCommentSchema = z.object({
  comment: z.string().min(1).max(2000)
})

export type CreateComment = z.infer<typeof CreateCommentSchema>

export const UpdateAssetPricingSchema = z.object({
  purchase_cost: z.number().nonnegative(),
  transport_cost: z.number().nonnegative(),
  processing_cost: z.number().nonnegative(),
  other_cost: z.number().nonnegative(),
  parts_cost: z.number().nonnegative(),
  sale_price: z.number().nonnegative(),
})

export type UpdateAssetPricing = z.infer<typeof UpdateAssetPricingSchema>

export const BulkUpdateAssetPricingSchema = z.object({
  items: z.array(z.object({ barcode: z.string() }).merge(UpdateAssetPricingSchema)).min(1).max(2000)
})

export type BulkUpdateAssetPricing = z.infer<typeof BulkUpdateAssetPricingSchema>

export const UpdateAssetSpecsSchema = z.object({
  cassettes: z.number().int().nonnegative().nullable(),
  internal_finisher: z.string().nullable(),
  meter_black: z.number().int().nonnegative().nullable(),
  meter_colour: z.number().int().nonnegative().nullable(),
  drum_life_c: z.number().int().nonnegative().nullable(),
  drum_life_m: z.number().int().nonnegative().nullable(),
  drum_life_y: z.number().int().nonnegative().nullable(),
  drum_life_k: z.number().int().nonnegative().nullable(),
  accessory_names: z.array(z.string()),
})

export type UpdateAssetSpecs = z.infer<typeof UpdateAssetSpecsSchema>

export const UpdateAssetLocationSchema = z.object({
  warehouse_id: z.number().int().positive(),
  zone_id: z.number().int().positive(),
  bin: z.string().default(''),
})

export type UpdateAssetLocation = z.infer<typeof UpdateAssetLocationSchema>


import { z } from 'zod'
import { ModelSummarySchema } from './model-types.js'
import { CoreFunctionsSchema, CountrySchema, StatusSchema } from './reference-data-types.js'

export const MIN_MANUFACTURED_YEAR = 1980
export const MAX_MANUFACTURED_YEAR = 2100

export const AssetLocationDetailsSchema = z.object({
  warehouse_code: z.string(),
  warehouse_street: z.string(),
  zone: z.string(),
  bin: z.string(),
})

export type AssetLocationDetails = z.infer<typeof AssetLocationDetailsSchema>

export const AssetIdentitySchema = z.object({
  id: z.number(),
  barcode: z.string(),
  brand: z.string(),
  model: z.string(),
  asset_type: z.string(),
  serial_number: z.string(),
})

export type AssetIdentity = z.infer<typeof AssetIdentitySchema>

export const AssetSummarySchema = AssetIdentitySchema.extend({
  meter_total: z.number().nullable(),
  cassettes: z.number().nullable(),
  internal_finisher: z.string().nullable(),
  accessories: z.array(z.string()),
  weight: z.number(),
  size: z.number(),
  status: z.string(),
  readiness: z.string(),
  location: AssetLocationDetailsSchema.nullable(),
  hold_number: z.string().nullable().optional(),
  purchase_invoice_number: z.string().nullable(),
  sales_invoice_number: z.string().nullable(),
  is_in_transit: z.boolean(),
  created_at: z.coerce.date(),
})

export type AssetSummary = z.infer<typeof AssetSummarySchema>

// Identity fields intentionally duplicated from AssetIdentitySchema — not extended.
// AssetSearchRow is its own contract sized for the global Search results table.
export const AssetSearchRowSchema = z.object({
  ...AssetIdentitySchema.shape,
  status: z.string(),
  readiness: z.string(),
  location: AssetLocationDetailsSchema.nullable(),
  is_in_transit: z.boolean(),
  created_at: z.coerce.date(),
  country_of_origin: z.string().nullable(),
  manufactured_year: z.number().nullable(),
  weight: z.number(),
  size: z.number(),
  specs_meter_total: z.number().nullable(),
  specs_cassettes: z.number().nullable(),
  specs_internal_finisher: z.string().nullable(),
  specs_toner_life_c: z.number().nullable(),
  specs_toner_life_m: z.number().nullable(),
  specs_toner_life_y: z.number().nullable(),
  specs_toner_life_k: z.number().nullable(),
  cost_purchase_cost: z.number().nullable(),
  cost_transport_cost: z.number().nullable(),
  cost_processing_cost: z.number().nullable(),
  cost_total_cost: z.number().nullable(),
  cost_sale_price: z.number().nullable(),
  hold_hold_number: z.string().nullable(),
  held_by: z.string().nullable(),
  hold_created_for: z.string().nullable(),
  hold_customer: z.string().nullable(),
  hold_created_at: z.coerce.date().nullable(),
  vendor: z.string().nullable(),
  customer: z.string().nullable(),
  departed_at: z.coerce.date().nullable(),
  arrival_created_at: z.coerce.date().nullable(),
  purchase_invoice_invoice_number: z.string().nullable(),
  latest_comment: z.string().nullable(),
  latest_comment_by: z.string().nullable(),
  latest_comment_at: z.coerce.date().nullable(),
})

export type AssetSearchRow = z.infer<typeof AssetSearchRowSchema>

const MAX_SERIAL_NUMBERS = 1000
const MAX_SERIAL_NUMBER_LENGTH = 50

export const AssetsBySerialNumberRequestSchema = z.object({
  serialNumbers: z.array(z.string().max(MAX_SERIAL_NUMBER_LENGTH)).min(1).max(MAX_SERIAL_NUMBERS),
})

export type AssetsBySerialNumberRequest = z.infer<typeof AssetsBySerialNumberRequestSchema>

export const AssetsBySerialNumberResultSchema = z.object({
  assets: z.array(AssetSearchRowSchema),
  notFound: z.array(z.string()),
})

export type AssetsBySerialNumberResult = z.infer<typeof AssetsBySerialNumberResultSchema>

export const AssetDetailsSchema = z.object({
  id: z.number(),
  barcode: z.string(),
  model: z.string(),
  is_colour: z.boolean(),
  brand: z.string(),
  brand_id: z.number(),
  asset_type: z.string(),
  serial_number: z.string(),
  status: z.string(),
  readiness: z.string(),
  is_in_transit: z.boolean(),
  country_of_origin: z.string().nullable(),
  manufactured_year: z.number().nullable(),
  weight: z.number(),
  size: z.number(),
  location: AssetLocationDetailsSchema.nullable(),
  cost: z.object({
    purchase_cost: z.number().nullable(),
    transport_cost: z.number().nullable(),
    processing_cost: z.number().nullable(),
    other_cost: z.number().nullable(),
    parts_cost: z.number().nullable(),
    total_cost: z.number().nullable(),
    sale_price: z.number().nullable(),
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
    drum_life_k: z.number().nullable(),
    toner_life_c: z.number().nullable(),
    toner_life_m: z.number().nullable(),
    toner_life_y: z.number().nullable(),
    toner_life_k: z.number().nullable(),
  }),
  hold: z
    .object({
      created_by: z.string(),
      created_for: z.string(),
      created_at: z.coerce.date().nullable(),
      customer: z.string(),
      from_dt: z.coerce.date().nullable(),
      to_dt: z.coerce.date().nullable(),
      notes: z.string().nullable(),
      hold_number: z.string(),
    })
    .nullable(),
  created_at: z.coerce.date(),
  arrival: z
    .object({
      arrival_number: z.string(),
      origin: z.string(),
      destination_code: z.string(),
      destination_street: z.string(),
      transporter: z.string(),
      created_by: z.string(),
      notes: z.string().nullable(),
      created_at: z.coerce.date(),
    })
    .nullable(),
  departure: z
    .object({
      departure_number: z.string(),
      origin_code: z.string(),
      origin_street: z.string(),
      destination: z.string(),
      transporter: z.string(),
      created_by: z.string(),
      notes: z.string().nullable(),
      created_at: z.coerce.date(),
    })
    .nullable(),
  purchase_invoice: z
    .object({
      invoice_number: z.string(),
      is_cleared: z.boolean(),
    })
    .nullable(),
  sales_invoice: z
    .object({
      invoice_number: z.string(),
      is_cleared: z.boolean(),
    })
    .nullable(),
  latest_comment: z.string().nullable(),
})

export type AssetDetails = z.infer<typeof AssetDetailsSchema>

// Subset of an asset error used as input on create + update flows.
// Frontend sends the error_id straight from the reference-data store; backend
// verifies the id's brand matches the asset's model brand.
export const UpdateErrorSchema = z.object({
  error_id: z.number().int().positive(),
  is_fixed: z.boolean(),
})
export type UpdateError = z.infer<typeof UpdateErrorSchema>

// POST /arrivals  (and POST /arrivals/:n/assets) — payload for creating an asset
export const CreateAssetSchema = z.object({
  model: ModelSummarySchema.refine((val) => !!val, 'Model is required'),
  serialNumber: z.string().refine((val) => val.length > 0, 'Serial number is required'),
  meterBlack: z.number().min(0, 'Meter must be positive'),
  meterColour: z.number().min(0, 'Meter must be positive'),
  cassettes: z.number().min(0, 'Cassettes are required'),
  readiness: StatusSchema,
  countryOfOrigin: CountrySchema.refine((val) => !!val, 'Country of origin is required'),
  manufacturedYear: z
    .number()
    .int()
    .min(MIN_MANUFACTURED_YEAR)
    .max(MAX_MANUFACTURED_YEAR)
    .nullable(),
  componentId: z.number().int().positive().nullable(),
  coreFunctions: z.array(CoreFunctionsSchema),
  drumLifeC: z.number().min(0, 'Drum life C required'),
  drumLifeM: z.number().min(0, 'Drum life M required'),
  drumLifeY: z.number().min(0, 'Drum life Y required'),
  drumLifeK: z.number().min(0, 'Drum life K required'),
  tonerLifeC: z.number().min(0, 'Toner life C required'),
  tonerLifeM: z.number().min(0, 'Toner life M required'),
  tonerLifeY: z.number().min(0, 'Toner life Y required'),
  tonerLifeK: z.number().min(0, 'Toner life K required'),
  errors: z.array(UpdateErrorSchema).default([]),
  comment: z.string().max(2000).nullable().default(null),
})
export type CreateAsset = z.infer<typeof CreateAssetSchema>

export const AssetErrorSchema = z.object({
  error_id: z.number(),
  brand_id: z.number(),
  code: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  is_fixed: z.boolean(),
  added_at: z.coerce.date().nullable(),
  added_by: z.string().nullable(),
  fixed_at: z.coerce.date().nullable(),
  fixed_by: z.string().nullable(),
})

export type AssetError = z.infer<typeof AssetErrorSchema>

export const CommentSchema = z.object({
  comment: z.string(),
  username: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  initials: z.string(),
})

export type Comment = z.infer<typeof CommentSchema>

export const AssetTransferSchema = z.object({
  created_at: z.coerce.date(),
  source_code: z.string(),
  source_stree: z.string(),
  destination_code: z.string(),
  destination_street: z.string(),
  transfer_number: z.string(),
  transporter: z.string(),
})

export type AssetTransfer = z.infer<typeof AssetTransferSchema>

export const AssetHarvestedPartSchema = z.object({
  recipient: z.string(),
  donor: z.string(),
  fixed_at: z.coerce.date(),
  fixed_by: z.string(),
  notes: z.string().nullable(),
  part: z.string(),
  is_exchange: z.boolean(),
})

export type AssetHarvestedPart = z.infer<typeof AssetHarvestedPartSchema>

export const BarcodeSuggestionSchema = z.object({
  barcode: z.string(),
  serial_number: z.string(),
  asset_type: z.string(),
  model: z.string(),
})

export type BarcodeSuggestion = z.infer<typeof BarcodeSuggestionSchema>

export const UpdateAssetErrorsSchema = z.object({
  errors: z.array(UpdateErrorSchema).max(100),
})

export type UpdateAssetErrors = z.infer<typeof UpdateAssetErrorsSchema>

export const CreateSalvagedPartSchema = z.object({
  donor_barcode: z.string().min(1, 'Donor is required'),
  part: z.string().min(1, 'Part is required'),
  is_exchange: z.boolean(),
  notes: z.string().optional(),
})

export type CreateSalvagedPart = z.infer<typeof CreateSalvagedPartSchema>

export const CreateCommentSchema = z.object({
  comment: z.string().min(1).max(2000),
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
  items: z
    .array(z.object({ barcode: z.string() }).merge(UpdateAssetPricingSchema))
    .min(1)
    .max(2000),
})

export type BulkUpdateAssetPricing = z.infer<typeof BulkUpdateAssetPricingSchema>

export const UpdateAssetSpecsSchema = z.object({
  readiness_id: z.number().int().positive(),
  country_of_origin_id: z.number().int().positive().nullable(),
  manufactured_year: z.number().int().nullable(),
  cassettes: z.number().int().nonnegative().nullable(),
  component_id: z.number().int().positive().nullable(),
  meter_black: z.number().int().nonnegative().nullable(),
  meter_colour: z.number().int().nonnegative().nullable(),
  drum_life_c: z.number().int().nonnegative().nullable(),
  drum_life_m: z.number().int().nonnegative().nullable(),
  drum_life_y: z.number().int().nonnegative().nullable(),
  drum_life_k: z.number().int().nonnegative().nullable(),
  toner_life_c: z.number().int().nonnegative().nullable(),
  toner_life_m: z.number().int().nonnegative().nullable(),
  toner_life_y: z.number().int().nonnegative().nullable(),
  toner_life_k: z.number().int().nonnegative().nullable(),
  accessory_names: z.array(z.string()),
})

export type UpdateAssetSpecs = z.infer<typeof UpdateAssetSpecsSchema>

export const UpdateAssetLocationSchema = z.object({
  warehouse_id: z.number().int().positive(),
  zone_id: z.number().int().positive(),
  bin: z.string().default(''),
})

export type UpdateAssetLocation = z.infer<typeof UpdateAssetLocationSchema>

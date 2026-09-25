import { z } from 'zod'

export const AssetCreateSnapshotSchema = z.object({
  barcode: z.string(),
  serial_number: z.string(),
  brand_name: z.string().optional(),
  model_name: z.string().optional(),
  arrival_number: z.string().nullable().optional(),
})

export const AssetUpdateDiffSchema = z.object({
  arrival_number: z.string().nullable().optional(),
  departure_number: z.string().nullable().optional(),
  hold_number: z.string().nullable().optional(),
  purchase_invoice_reference: z.string().nullable().optional(),
  sales_invoice_reference: z.string().nullable().optional(),
  warehouse: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
  bin: z.string().nullable().optional(),
  transfer_number: z.string().nullable().optional(),
  model_name: z.string().optional(),
  status: z.string().nullable().optional(),
  readiness: z.string().nullable().optional(),
  serial_number: z.string().optional(),
  manufactured_year: z.number().nullable().optional(),
  country_of_origin: z.string().nullable().optional(),
  meter_black: z.number().nullable().optional(),
  meter_colour: z.number().nullable().optional(),
  meter_total: z.number().nullable().optional(),
  cassettes: z.number().nullable().optional(),
  internal_finisher: z.string().nullable().optional(),
  drum_life_c: z.number().nullable().optional(),
  drum_life_m: z.number().nullable().optional(),
  drum_life_y: z.number().nullable().optional(),
  drum_life_k: z.number().nullable().optional(),
  toner_life_c: z.number().nullable().optional(),
  toner_life_m: z.number().nullable().optional(),
  toner_life_y: z.number().nullable().optional(),
  toner_life_k: z.number().nullable().optional(),
  is_damaged: z.boolean().nullable().optional(),
  damage_notes: z.string().nullable().optional(),
  purchase_cost: z.number().nullable().optional(),
  transport_cost: z.number().nullable().optional(),
  transfer_cost: z.number().nullable().optional(),
  processing_cost: z.number().nullable().optional(),
  other_cost: z.number().nullable().optional(),
  parts_cost: z.number().nullable().optional(),
  total_cost: z.number().nullable().optional(),
  sale_price: z.number().nullable().optional(),
  error_codes: z.array(z.string()).optional(),
})

const LocationPartsSchema = z.object({
  warehouse: z.string().nullable(),
  zone: z.string().nullable(),
  bin: z.string().nullable(),
})

const TransferMovementSchema = z.object({
  transfer_number: z.string(),
  origin_city_code: z.string(),
  destination_city_code: z.string(),
  before: LocationPartsSchema,
  after: LocationPartsSchema,
})

const ErrorsChangedSchema = z.object({
  added: z.array(z.string()),
  fixed: z.array(z.string()),
  reopened: z.array(z.string()),
  removed: z.array(z.string()),
})

const PartAddedSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('store'), part_number: z.string(), quantity: z.number() }),
  z.object({
    source: z.literal('harvested'),
    part: z.string(),
    donor_barcode: z.string(),
    is_exchange: z.boolean(),
  }),
])

const PartHarvestedSchema = z.object({
  part: z.string(),
  recipient_barcode: z.string(),
  is_exchange: z.boolean(),
})

const AssetRecordBase = {
  user_name: z.string(),
  changed_on: z.coerce.date(),
}

export const AssetHistoryRecordSchema = z.discriminatedUnion('action_type', [
  z.object({
    action_type: z.literal('CREATE'),
    ...AssetRecordBase,
    changes: z.object({ after: AssetCreateSnapshotSchema }),
  }),
  z.object({
    action_type: z.literal('UPDATE'),
    ...AssetRecordBase,
    changes: z.object({ before: AssetUpdateDiffSchema, after: AssetUpdateDiffSchema }),
  }),
  z.object({
    action_type: z.literal('ERRORS_CHANGED'),
    ...AssetRecordBase,
    changes: ErrorsChangedSchema,
  }),
  z.object({
    action_type: z.literal('PART_ADDED'),
    ...AssetRecordBase,
    changes: PartAddedSchema,
  }),
  z.object({
    action_type: z.literal('PART_HARVESTED'),
    ...AssetRecordBase,
    changes: PartHarvestedSchema,
  }),
  z.object({
    action_type: z.literal('TRANSFER_DISPATCHED'),
    ...AssetRecordBase,
    changes: TransferMovementSchema,
  }),
  z.object({
    action_type: z.literal('TRANSFER_RECEIVED'),
    ...AssetRecordBase,
    changes: TransferMovementSchema,
  }),
  z.object({
    action_type: z.literal('TRANSFER_RETURNED'),
    ...AssetRecordBase,
    changes: TransferMovementSchema,
  }),
])

export const AssetHistorySchema = z.array(AssetHistoryRecordSchema)

export type AssetCreateSnapshot = z.infer<typeof AssetCreateSnapshotSchema>
export type AssetUpdateDiff = z.infer<typeof AssetUpdateDiffSchema>
export type LocationParts = z.infer<typeof LocationPartsSchema>
export type ErrorsChanged = z.infer<typeof ErrorsChangedSchema>
export type PartAdded = z.infer<typeof PartAddedSchema>
export type PartHarvested = z.infer<typeof PartHarvestedSchema>
export type AssetHistoryRecord = z.infer<typeof AssetHistoryRecordSchema>
export type AssetHistory = z.infer<typeof AssetHistorySchema>

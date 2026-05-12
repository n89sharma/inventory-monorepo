import { z } from 'zod'

export const AssetCreateSnapshotSchema = z.object({
  barcode: z.string(),
  serial_number: z.string(),
  brand_name: z.string().optional(),
  model_name: z.string().optional(),
  arrival_number: z.string().nullable().optional()
})

export const AssetUpdateDiffSchema = z.object({
  arrival_number: z.string().nullable().optional(),
  departure_number: z.string().nullable().optional(),
  hold_number: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  model_name: z.string().optional(),
  technical_status: z.string().optional(),
  serial_number: z.string().optional(),
  meter_black: z.number().nullable().optional(),
  meter_colour: z.number().nullable().optional(),
  meter_total: z.number().nullable().optional(),
  cassettes: z.number().nullable().optional(),
  internal_finisher: z.string().nullable().optional(),
  drum_life_c: z.number().nullable().optional(),
  drum_life_m: z.number().nullable().optional(),
  drum_life_y: z.number().nullable().optional(),
  drum_life_k: z.number().nullable().optional(),
  purchase_cost: z.number().nullable().optional(),
  transport_cost: z.number().nullable().optional(),
  processing_cost: z.number().nullable().optional(),
  other_cost: z.number().nullable().optional(),
  parts_cost: z.number().nullable().optional(),
  total_cost: z.number().nullable().optional(),
  sale_price: z.number().nullable().optional(),
  error_codes: z.array(z.string()).optional()
})

const AssetRecordBase = {
  user_name: z.string(),
  changed_on: z.coerce.date()
}

export const AssetHistoryRecordSchema = z.discriminatedUnion('action_type', [
  z.object({
    action_type: z.literal('CREATE'),
    ...AssetRecordBase,
    changes: z.object({ after: AssetCreateSnapshotSchema })
  }),
  z.object({
    action_type: z.literal('UPDATE'),
    ...AssetRecordBase,
    changes: z.object({ before: AssetUpdateDiffSchema, after: AssetUpdateDiffSchema })
  })
])

export const AssetHistorySchema = z.array(AssetHistoryRecordSchema)

export type AssetCreateSnapshot = z.infer<typeof AssetCreateSnapshotSchema>
export type AssetUpdateDiff = z.infer<typeof AssetUpdateDiffSchema>
export type AssetHistoryRecord = z.infer<typeof AssetHistoryRecordSchema>
export type AssetHistory = z.infer<typeof AssetHistorySchema>

import { z } from 'zod'

export const METER_BAND = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'] as const
export type MeterBand = (typeof METER_BAND)[number]

export const InStockSummaryRowSchema = z.object({
  warehouse_id: z.number().int(),
  brand_id: z.number().int(),
  brand_name: z.string(),
  asset_type_id: z.number().int(),
  asset_type: z.string(),
  model_id: z.number().int(),
  model_name: z.string(),
  meter_band: z.enum(METER_BAND),
  purchase_cost_sum: z.number().nullable(),
  purchase_cost_count: z.number().int(),
  total_cost_sum: z.number().nullable(),
  total_cost_count: z.number().int(),
  asset_count: z.number().int(),
})
export type InStockSummaryRow = z.infer<typeof InStockSummaryRowSchema>

export const InStockSummaryReportSchema = z.array(InStockSummaryRowSchema)
export type InStockSummaryReport = z.infer<typeof InStockSummaryReportSchema>

import { z } from 'zod'

export const METER_BAND = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'] as const
export type MeterBand = (typeof METER_BAND)[number]

export const InStockSummaryRowSchema = z.object({
  warehouse_id: z.number().int(),
  city_code: z.string(),
  brand_id: z.number().int(),
  brand_name: z.string(),
  asset_type_id: z.number().int(),
  asset_type: z.string(),
  model_id: z.number().int(),
  model_name: z.string(),
  meter_band: z.enum(METER_BAND),
  avg_purchase_cost: z.number().nullable(),
  avg_total_cost: z.number().nullable(),
  asset_count: z.number().int(),
})
export type InStockSummaryRow = z.infer<typeof InStockSummaryRowSchema>

export const InStockSummaryReportSchema = z.array(InStockSummaryRowSchema)
export type InStockSummaryReport = z.infer<typeof InStockSummaryReportSchema>

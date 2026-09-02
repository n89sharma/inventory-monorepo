import { z } from 'zod'

export const MIN_MONTH = 1
export const MAX_MONTH = 12

export const ProfitabilityCubeRowSchema = z.object({
  warehouse_id: z.number().int(),
  sales_rep_id: z.number().int().nullable(),
  vendor_id: z.number().int().nullable(),
  customer_id: z.number().int(),
  brand_id: z.number().int(),
  month: z.number().int().min(MIN_MONTH).max(MAX_MONTH),
  asset_count: z.number().int(),
  cogs: z.number(),
  gross_revenue: z.number(),
  gross_margin: z.number(),
})

export type ProfitabilityCubeRow = z.infer<typeof ProfitabilityCubeRowSchema>

export const ProfitabilityReportSchema = z.array(ProfitabilityCubeRowSchema)

export type ProfitabilityReport = z.infer<typeof ProfitabilityReportSchema>

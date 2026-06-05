import { z } from 'zod'

export const MIN_MONTH = 1
export const MAX_MONTH = 12

export const ProfitabilityCubeRowSchema = z.object({
  warehouse_id: z.number().int(),
  warehouse_code: z.string(),
  sales_rep_id: z.number().int().nullable(),
  sales_rep_name: z.string().nullable(),
  vendor_id: z.number().int().nullable(),
  vendor_name: z.string().nullable(),
  brand_id: z.number().int(),
  brand_name: z.string(),
  month: z.number().int().min(MIN_MONTH).max(MAX_MONTH),
  asset_count: z.number().int(),
  gross_revenue: z.number(),
  cogs_base: z.number(),
  cogs_total: z.number(),
  freight_cost: z.number(),
  gross_margin_base: z.number(),
  gross_margin: z.number(),
})

export type ProfitabilityCubeRow = z.infer<typeof ProfitabilityCubeRowSchema>

export const ProfitabilityReportSchema = z.array(ProfitabilityCubeRowSchema)

export type ProfitabilityReport = z.infer<typeof ProfitabilityReportSchema>

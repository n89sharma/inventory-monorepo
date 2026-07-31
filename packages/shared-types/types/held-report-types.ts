import { z } from 'zod'

export const HeldReportRowSchema = z.object({
  sales_rep_id: z.number().int(),
  sales_rep_name: z.string(),
  customer_id: z.number().int(),
  customer_name: z.string(),
  days_held: z.number().int(),
  held_asset_count: z.number().int(),
})
export type HeldReportRow = z.infer<typeof HeldReportRowSchema>

export const HeldReportSchema = z.array(HeldReportRowSchema)
export type HeldReport = z.infer<typeof HeldReportSchema>

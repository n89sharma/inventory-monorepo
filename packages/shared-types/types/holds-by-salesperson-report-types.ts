import { z } from 'zod'

export const ActiveHoldRowSchema = z.object({
  sales_rep_id: z.number().int(),
  sales_rep_name: z.string(),
  customer_id: z.number().int(),
  customer_name: z.string(),
  days_held: z.number().int(),
  held_asset_count: z.number().int(),
})
export type ActiveHoldRow = z.infer<typeof ActiveHoldRowSchema>

export const HoldsBySalespersonReportSchema = z.array(ActiveHoldRowSchema)
export type HoldsBySalespersonReport = z.infer<typeof HoldsBySalespersonReportSchema>

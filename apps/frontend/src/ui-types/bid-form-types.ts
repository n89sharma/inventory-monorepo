import { BidMarginPercentSchema, OrgSummarySchema } from 'shared-types'
import type { OrgSummary } from 'shared-types'
import z from 'zod'

export const BidFormSchema = z.object({
  vendor: OrgSummarySchema.nullable().refine((val) => !!val, 'Vendor is required'),
  received_date: z
    .date()
    .nullable()
    .refine((val) => !!val, 'Date received is required'),
  due_date: z
    .date()
    .nullable()
    .refine((val) => !!val, 'Due date is required'),
  margin_percent: z
    .string()
    .refine(
      (val) => BidMarginPercentSchema.safeParse(parseFloat(val)).success,
      'Margin must be at least 0% and under 100%',
    ),
  transport_cost: z.string().refine((val) => parseFloat(val) >= 0, 'Freight must be zero or more'),
  notes: z.string(),
})

export type BidForm = {
  vendor: OrgSummary | null
  received_date: Date | null
  due_date: Date | null
  margin_percent: string
  transport_cost: string
  notes: string
}

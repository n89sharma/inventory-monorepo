import { OrgSummarySchema } from 'shared-types'
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
  notes: z.string(),
})

export type BidForm = {
  vendor: OrgSummary | null
  received_date: Date | null
  due_date: Date | null
  notes: string
}

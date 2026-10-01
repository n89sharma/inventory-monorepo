import { z } from 'zod'
import { OrgSummarySchema } from '../organization-types.js'

export const BID_UPLOAD_LIMITS = {
  columns: 60,
  rows: 2000,
  headerLength: 200,
  cellLength: 1000,
} as const

export const DEFAULT_BID_MARGIN_PERCENT = 25
export const DEFAULT_BID_TRANSPORT_COST = 30

export const BidMarginPercentSchema = z.number().min(0).lt(100)

export const BidStatusSchema = z.enum(['DRAFT', 'REVIEW', 'SUBMITTED', 'CONCLUDED'])
export type BidStatus = z.infer<typeof BidStatusSchema>
export const BID_STATUS = BidStatusSchema.enum

export const BidOutcomeSchema = z.enum(['WON', 'LOST'])
export type BidOutcome = z.infer<typeof BidOutcomeSchema>
export const BID_OUTCOME = BidOutcomeSchema.enum

export const BidSummarySchema = z.object({
  bid_number: z.string(),
  status: z.string(),
  outcome: z.string().nullable(),
  received_date: z.iso.date(),
  due_date: z.iso.date(),
  submitted_date: z.iso.date().nullable(),
  vendor: OrgSummarySchema,
  notes: z.string().nullable(),
  total_cost: z.number(),
})
export type BidSummary = z.infer<typeof BidSummarySchema>

export const BidRowSchema = z.object({
  id: z.number().int(),
  cells: z.array(z.string()),
  selling_price: z.number().nullable(),
  transport_cost: z.number().nullable(),
  transport_cost_overridden: z.boolean(),
  margin_percent: z.number().nullable(),
  margin_overridden: z.boolean(),
  zero_priced: z.boolean(),
  priced: z.boolean(),
  bid_price: z.number().nullable(),
  total_cost: z.number().nullable(),
})
export type BidRow = z.infer<typeof BidRowSchema>

export const BidTotalsSchema = z.object({
  total_cost: z.number(),
  expected_sale: z.number(),
  expected_margin: z.number(),
  unpriced_count: z.number().int(),
})
export type BidTotals = z.infer<typeof BidTotalsSchema>

export const BidDetailSchema = BidSummarySchema.extend({
  created_at: z.coerce.date(),
  created_by: z.string().optional(),
  margin_percent: z.number(),
  transport_cost: z.number(),
  headers: z.array(z.string()),
  rows: z.array(BidRowSchema),
  totals: BidTotalsSchema,
})
export type BidDetail = z.infer<typeof BidDetailSchema>

export const BidMetadataSchema = z.object({
  vendor: OrgSummarySchema,
  received_date: z.iso.date(),
  due_date: z.iso.date(),
  margin_percent: BidMarginPercentSchema,
  transport_cost: z.number().nonnegative(),
  comment: z.string().nullable(),
})
export type BidMetadata = z.infer<typeof BidMetadataSchema>

export const UploadBidRowsSchema = z
  .object({
    headers: z
      .array(z.string().max(BID_UPLOAD_LIMITS.headerLength))
      .nonempty()
      .max(BID_UPLOAD_LIMITS.columns),
    rows: z
      .array(z.array(z.string().max(BID_UPLOAD_LIMITS.cellLength)))
      .nonempty()
      .max(BID_UPLOAD_LIMITS.rows),
  })
  .refine((data) => data.rows.every((row) => row.length === data.headers.length), {
    message: 'Every row must have one cell per column',
    path: ['rows'],
  })
export type UploadBidRows = z.infer<typeof UploadBidRowsSchema>

export const UpdateBidRowsSchema = z
  .object({
    row_ids: z.array(z.number().int()).nonempty().max(BID_UPLOAD_LIMITS.rows),
    selling_price: z.number().nonnegative().nullable().optional(),
    transport_cost: z.number().nonnegative().nullable().optional(),
    margin_percent: BidMarginPercentSchema.nullable().optional(),
    zero_priced: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.selling_price !== undefined ||
      data.transport_cost !== undefined ||
      data.margin_percent !== undefined ||
      data.zero_priced !== undefined,
    { message: 'Nothing to update' },
  )
export type UpdateBidRows = z.infer<typeof UpdateBidRowsSchema>

export const ConcludeBidSchema = z.object({ outcome: BidOutcomeSchema })
export type ConcludeBid = z.infer<typeof ConcludeBidSchema>

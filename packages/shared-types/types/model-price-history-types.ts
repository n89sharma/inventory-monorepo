import { z } from 'zod'

export const ModelPriceHistoryRowSchema = z.object({
  barcode: z.string(),
  departed_at: z.coerce.date(),
  purchase_price: z.number().nullable(),
  sale_price: z.number(),
  meter: z.number().nullable(),
  customer: z.string().nullable(),
  salesperson: z.string().nullable(),
  cassettes: z.number().nullable(),
  internal_finisher: z.string().nullable(),
  core_functions: z.array(z.string()),
})
export type ModelPriceHistoryRow = z.infer<typeof ModelPriceHistoryRowSchema>

export const ModelPriceHistoryResultSchema = z.object({
  sales: z.array(ModelPriceHistoryRowSchema),
  last_sale: ModelPriceHistoryRowSchema.nullable(),
  in_stock_count: z.number(),
})
export type ModelPriceHistoryResult = z.infer<typeof ModelPriceHistoryResultSchema>

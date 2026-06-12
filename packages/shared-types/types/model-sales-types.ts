import { z } from 'zod';

export const ModelSaleRowSchema = z.object({
  barcode: z.string(),
  departed_at: z.coerce.date(),
  sale_price: z.number(),
  meter: z.number().nullable(),
  customer: z.string().nullable(),
  salesperson: z.string().nullable(),
  cassettes: z.number().nullable(),
  internal_finisher: z.string().nullable(),
  core_functions: z.array(z.string()),
});
export type ModelSaleRow = z.infer<typeof ModelSaleRowSchema>;

export const ModelSalesResultSchema = z.object({
  sales: z.array(ModelSaleRowSchema),
  last_sale: ModelSaleRowSchema.nullable(),
  in_stock_count: z.number(),
});
export type ModelSalesResult = z.infer<typeof ModelSalesResultSchema>;

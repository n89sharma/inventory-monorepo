import { z } from 'zod'

export const METER_BAND = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'] as const
export type MeterBand = (typeof METER_BAND)[number]

export const StockSalesRowSchema = z.object({
  brand_id: z.number().int(),
  brand_name: z.string(),
  asset_type_id: z.number().int(),
  asset_type: z.string(),
  model_id: z.number().int(),
  model_name: z.string(),
  meter_band: z.enum(METER_BAND),
  purchase_cost_sum: z.number().nullable(),
  purchase_cost_count: z.number().int(),
  total_cost_sum: z.number().nullable(),
  total_cost_count: z.number().int(),
  in_stock_count: z.number().int(),
  held_count: z.number().int(),
})
export type StockSalesRow = z.infer<typeof StockSalesRowSchema>

export const StockSalesSalePriceGroupSchema = z.object({
  brand_id: z.number().int(),
  brand_name: z.string(),
  asset_type_id: z.number().int(),
  asset_type: z.string(),
  model_id: z.number().int(),
  model_name: z.string(),
  meter_band: z.enum(METER_BAND),
  sale_prices: z.array(z.number()),
  profit_sum: z.number().nullable(),
})
export type StockSalesSalePriceGroup = z.infer<typeof StockSalesSalePriceGroupSchema>

export const StockSalesReportSchema = z.object({
  stock: z.array(StockSalesRowSchema),
  sale_prices: z.array(StockSalesSalePriceGroupSchema).nullable(),
})
export type StockSalesReport = z.infer<typeof StockSalesReportSchema>

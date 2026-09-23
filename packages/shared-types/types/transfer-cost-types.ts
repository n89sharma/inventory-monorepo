import { z } from 'zod'

// Per-warehouse default costs applied to every machine on a transfer at dispatch.
// Also the body of PUT /transfer-costs/:warehouseId.
export const TransferCostsSchema = z.object({
  transfer_cost: z.number().nonnegative(),
  processing_cost: z.number().nonnegative(),
  // Added on top of processing_cost for every machine whose readiness is not UNTESTED.
  tested_processing_cost: z.number().nonnegative(),
  other_cost: z.number().nonnegative(),
})
export type TransferCosts = z.infer<typeof TransferCostsSchema>

// GET /transfer-costs
export const WarehouseTransferCostSchema = TransferCostsSchema.extend({
  warehouse_id: z.number(),
})
export type WarehouseTransferCost = z.infer<typeof WarehouseTransferCostSchema>

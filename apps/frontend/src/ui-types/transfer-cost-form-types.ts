import type { TransferCosts } from 'shared-types'
import { z } from 'zod'

// The price inputs hold strings; each amount is required and cannot be negative.
const AmountSchema = z
  .string()
  .min(1, 'Required')
  .refine((value) => Number.isFinite(parseFloat(value)) && parseFloat(value) >= 0, 'Invalid amount')

export const TransferCostFormSchema = z.object({
  transfer_cost: AmountSchema,
  processing_cost: AmountSchema,
  tested_processing_cost: AmountSchema,
  other_cost: AmountSchema,
})

export type TransferCostForm = z.infer<typeof TransferCostFormSchema>

export function toTransferCosts(form: TransferCostForm): TransferCosts {
  return {
    transfer_cost: parseFloat(form.transfer_cost),
    processing_cost: parseFloat(form.processing_cost),
    tested_processing_cost: parseFloat(form.tested_processing_cost),
    other_cost: parseFloat(form.other_cost),
  }
}

export function toTransferCostForm(costs: TransferCosts): TransferCostForm {
  return {
    transfer_cost: costs.transfer_cost.toString(),
    processing_cost: costs.processing_cost.toString(),
    tested_processing_cost: costs.tested_processing_cost.toString(),
    other_cost: costs.other_cost.toString(),
  }
}

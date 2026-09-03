import { COST_COMPONENT_FIELDS, type CostComponentField } from 'shared-types'

export type CostFieldId = CostComponentField | 'sale_price'

export const ASSET_PRICING_FIELDS = [...COST_COMPONENT_FIELDS, 'sale_price'] as const

export const COST_FIELD_LABELS = {
  purchase_cost: 'Purchase Cost',
  transport_cost: 'Transport Cost',
  transfer_cost: 'Transfer Cost',
  processing_cost: 'Processing Cost',
  other_cost: 'Other Cost',
  parts_cost: 'Parts Cost',
  sale_price: 'Sale Price',
} as const satisfies Record<CostFieldId, string>

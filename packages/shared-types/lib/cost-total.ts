import { COST_COMPONENT_FIELDS, type CostComponentField } from '../types/asset-types.js'

export function totalCostFromComponents(
  components: Partial<Record<CostComponentField, number | null>>,
): number {
  return COST_COMPONENT_FIELDS.reduce((total, field) => total + (components[field] ?? 0), 0)
}

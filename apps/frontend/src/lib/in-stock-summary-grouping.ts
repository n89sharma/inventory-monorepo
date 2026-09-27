import type { InStockSummaryRow } from 'shared-types'

type CostTotals = {
  purchase_cost_sum: number | null
  purchase_cost_count: number
  total_cost_sum: number | null
  total_cost_count: number
}

export type InStockSummaryModelRow = Pick<
  InStockSummaryRow,
  'brand_id' | 'brand_name' | 'asset_type_id' | 'asset_type' | 'model_id' | 'model_name'
> & {
  asset_count: number
  avg_purchase_cost: number | null
  avg_total_cost: number | null
}

type ModelAccumulator = Omit<InStockSummaryModelRow, 'avg_purchase_cost' | 'avg_total_cost'> &
  CostTotals

function addNullable(total: number | null, value: number | null): number | null {
  if (value === null) return total
  return (total ?? 0) + value
}

function average(sum: number | null, count: number): number | null {
  if (sum === null || count === 0) return null
  return sum / count
}

export function buildInStockSummaryGroups(rows: InStockSummaryRow[]): InStockSummaryModelRow[] {
  const groups = new Map<number, ModelAccumulator>()
  for (const row of rows) {
    const existing = groups.get(row.model_id)
    if (existing) {
      existing.asset_count += row.asset_count
      existing.purchase_cost_sum = addNullable(existing.purchase_cost_sum, row.purchase_cost_sum)
      existing.purchase_cost_count += row.purchase_cost_count
      existing.total_cost_sum = addNullable(existing.total_cost_sum, row.total_cost_sum)
      existing.total_cost_count += row.total_cost_count
    } else {
      groups.set(row.model_id, {
        brand_id: row.brand_id,
        brand_name: row.brand_name,
        asset_type_id: row.asset_type_id,
        asset_type: row.asset_type,
        model_id: row.model_id,
        model_name: row.model_name,
        asset_count: row.asset_count,
        purchase_cost_sum: row.purchase_cost_sum,
        purchase_cost_count: row.purchase_cost_count,
        total_cost_sum: row.total_cost_sum,
        total_cost_count: row.total_cost_count,
      })
    }
  }

  return Array.from(groups.values(), (group) => ({
    brand_id: group.brand_id,
    brand_name: group.brand_name,
    asset_type_id: group.asset_type_id,
    asset_type: group.asset_type,
    model_id: group.model_id,
    model_name: group.model_name,
    asset_count: group.asset_count,
    avg_purchase_cost: average(group.purchase_cost_sum, group.purchase_cost_count),
    avg_total_cost: average(group.total_cost_sum, group.total_cost_count),
  }))
}

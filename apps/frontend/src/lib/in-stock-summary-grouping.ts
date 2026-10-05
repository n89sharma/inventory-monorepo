import { median } from '@/lib/model-price-history-summary'
import type { InStockSalePriceGroup, InStockSummaryRow, MeterBand } from 'shared-types'

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
  median_sale_price: number | null
  margin_percent: number | null
  sales_count: number
}

type ModelAccumulator = Omit<
  InStockSummaryModelRow,
  'avg_purchase_cost' | 'avg_total_cost' | 'median_sale_price' | 'margin_percent' | 'sales_count'
> &
  CostTotals

const NO_SALE_PRICES: number[] = []

function addNullable(total: number | null, value: number | null): number | null {
  if (value === null) return total
  return (total ?? 0) + value
}

function average(sum: number | null, count: number): number | null {
  if (sum === null || count === 0) return null
  return sum / count
}

function marginPercent(salePrice: number | null, cost: number | null): number | null {
  if (salePrice === null || cost === null || salePrice === 0) return null
  return ((salePrice - cost) / salePrice) * 100
}

function collectSalePrices(
  salePriceGroups: InStockSalePriceGroup[],
  band: MeterBand | null,
): Map<number, number[]> {
  const pricesByModel = new Map<number, number[]>()
  for (const group of salePriceGroups) {
    if (band !== null && group.meter_band !== band) continue
    const prices = pricesByModel.get(group.model_id)
    if (prices) {
      prices.push(...group.sale_prices)
    } else {
      pricesByModel.set(group.model_id, [...group.sale_prices])
    }
  }
  return pricesByModel
}

export function buildInStockSummaryGroups(
  rows: InStockSummaryRow[],
  salePriceGroups: InStockSalePriceGroup[],
  band: MeterBand | null,
): InStockSummaryModelRow[] {
  const salePricesByModel = collectSalePrices(salePriceGroups, band)
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

  return Array.from(groups.values(), (group) => {
    const salePrices = salePricesByModel.get(group.model_id) ?? NO_SALE_PRICES
    const avgTotalCost = average(group.total_cost_sum, group.total_cost_count)
    const medianSalePrice = median(salePrices)
    return {
      brand_id: group.brand_id,
      brand_name: group.brand_name,
      asset_type_id: group.asset_type_id,
      asset_type: group.asset_type,
      model_id: group.model_id,
      model_name: group.model_name,
      asset_count: group.asset_count,
      avg_purchase_cost: average(group.purchase_cost_sum, group.purchase_cost_count),
      avg_total_cost: avgTotalCost,
      median_sale_price: medianSalePrice,
      margin_percent: marginPercent(medianSalePrice, avgTotalCost),
      sales_count: salePrices.length,
    }
  })
}

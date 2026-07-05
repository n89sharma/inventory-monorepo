import type { InStockSummaryRow, MeterBand } from 'shared-types'

const BAND_DISPLAY_ORDER = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'UNKNOWN',
] as const satisfies readonly MeterBand[]
const BAND_SORT_INDEX = Object.fromEntries(
  BAND_DISPLAY_ORDER.map((band, index) => [band, index]),
) as Record<MeterBand, number>

type CostField = 'avg_purchase_cost' | 'avg_total_cost'

export type InStockSummaryModelRow = Omit<InStockSummaryRow, 'meter_band'> & {
  subRows: InStockSummaryRow[]
}

export type InStockSummaryTableRow = InStockSummaryModelRow | InStockSummaryRow

function groupKey(row: InStockSummaryRow): string {
  return `${row.warehouse_id}|${row.brand_id}|${row.asset_type_id}|${row.model_id}`
}

function weightedAverage(bands: InStockSummaryRow[], field: CostField): number | null {
  let weightedSum = 0
  let weight = 0
  for (const band of bands) {
    const value = band[field]
    if (value === null) continue
    weightedSum += value * band.asset_count
    weight += band.asset_count
  }
  return weight === 0 ? null : weightedSum / weight
}

export function buildInStockSummaryGroups(rows: InStockSummaryRow[]): InStockSummaryModelRow[] {
  const groups = new Map<string, InStockSummaryRow[]>()
  for (const row of rows) {
    const key = groupKey(row)
    const existing = groups.get(key)
    if (existing) existing.push(row)
    else groups.set(key, [row])
  }

  return Array.from(groups.values()).map((bands) => {
    const subRows = [...bands].sort(
      (a, b) => BAND_SORT_INDEX[a.meter_band] - BAND_SORT_INDEX[b.meter_band],
    )
    const first = subRows[0]
    return {
      warehouse_id: first.warehouse_id,
      city_code: first.city_code,
      brand_id: first.brand_id,
      brand_name: first.brand_name,
      asset_type_id: first.asset_type_id,
      asset_type: first.asset_type,
      model_id: first.model_id,
      model_name: first.model_name,
      avg_purchase_cost: weightedAverage(subRows, 'avg_purchase_cost'),
      avg_total_cost: weightedAverage(subRows, 'avg_total_cost'),
      asset_count: subRows.reduce((total, band) => total + band.asset_count, 0),
      subRows,
    }
  })
}

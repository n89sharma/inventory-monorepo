import type { ProfitabilityCubeRow } from 'shared-types'

const MONTHS_IN_YEAR = 12

export type ProfitabilityFilters = {
  year: number
  warehouseIds: number[]
  salesRepId: number | null
  vendorId: number | null
  brandId: number | null
}

export type ProfitabilityMetrics = {
  asset_count: number
  gross_revenue: number
  cogs: number
  gross_margin: number
}

export type MonthRow = ProfitabilityMetrics & { month: number }

export type ProfitabilityTable = {
  months: MonthRow[]
  totals: ProfitabilityMetrics
}

function zeroMetrics(): ProfitabilityMetrics {
  return {
    asset_count: 0,
    gross_revenue: 0,
    cogs: 0,
    gross_margin: 0,
  }
}

function addMetrics(target: ProfitabilityMetrics, row: ProfitabilityCubeRow): void {
  target.asset_count += row.asset_count
  target.gross_revenue += row.gross_revenue
  target.cogs += row.cogs
  target.gross_margin += row.gross_margin
}

function matchesDimension(rowId: number | null, filter: number | null): boolean {
  if (filter === null) return true
  return rowId === filter
}

function matchesWarehouse(rowId: number, filterIds: number[]): boolean {
  if (filterIds.length === 0) return true
  return filterIds.includes(rowId)
}

export function aggregateCube(
  rows: ProfitabilityCubeRow[],
  filters: ProfitabilityFilters,
): ProfitabilityTable {
  const months: MonthRow[] = Array.from({ length: MONTHS_IN_YEAR }, (_, i) => ({
    month: i + 1,
    ...zeroMetrics(),
  }))
  const totals = zeroMetrics()

  for (const row of rows) {
    if (!matchesWarehouse(row.warehouse_id, filters.warehouseIds)) continue
    if (!matchesDimension(row.sales_rep_id, filters.salesRepId)) continue
    if (!matchesDimension(row.vendor_id, filters.vendorId)) continue
    if (!matchesDimension(row.brand_id, filters.brandId)) continue
    addMetrics(months[row.month - 1], row)
    addMetrics(totals, row)
  }

  return { months, totals }
}

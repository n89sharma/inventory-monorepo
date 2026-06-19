import type { ProfitabilityCubeRow } from 'shared-types'
import { NONE_FILTER, type DimensionValue, type ProfitabilityFilters } from './profitability-report-url-params'

const MONTHS_IN_YEAR = 12
const NONE_LABEL = '— None —'

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

export type DimensionOption = {
  value: number | typeof NONE_FILTER
  label: string
}

export type FilterOptions = {
  warehouses: DimensionOption[]
  salespeople: DimensionOption[]
  vendors: DimensionOption[]
  brands: DimensionOption[]
}

function zeroMetrics(): ProfitabilityMetrics {
  return {
    asset_count: 0,
    gross_revenue: 0,
    cogs: 0,
    gross_margin: 0
  }
}

function addMetrics(target: ProfitabilityMetrics, row: ProfitabilityCubeRow): void {
  target.asset_count += row.asset_count
  target.gross_revenue += row.gross_revenue
  target.cogs += row.cogs
  target.gross_margin += row.gross_margin
}

function matchesDimension(rowId: number | null, filter: DimensionValue): boolean {
  if (filter === null) return true
  if (filter === NONE_FILTER) return rowId === null
  return rowId === filter
}

function sortOptions(options: DimensionOption[]): DimensionOption[] {
  return [...options].sort((a, b) => {
    if (a.value === NONE_FILTER) return 1
    if (b.value === NONE_FILTER) return -1
    return a.label.localeCompare(b.label)
  })
}

export function deriveFilterOptions(rows: ProfitabilityCubeRow[]): FilterOptions {
  const warehouses = new Map<number, string>()
  const salespeople = new Map<number, string>()
  const vendors = new Map<number, string>()
  const brands = new Map<number, string>()
  let salesRepHasNone = false
  let vendorHasNone = false

  for (const row of rows) {
    warehouses.set(row.warehouse_id, row.warehouse_code)
    brands.set(row.brand_id, row.brand_name)
    if (row.sales_rep_id === null) salesRepHasNone = true
    else salespeople.set(row.sales_rep_id, row.sales_rep_name ?? String(row.sales_rep_id))
    if (row.vendor_id === null) vendorHasNone = true
    else vendors.set(row.vendor_id, row.vendor_name ?? String(row.vendor_id))
  }

  const toOptions = (entries: Map<number, string>, hasNone: boolean): DimensionOption[] => {
    const options: DimensionOption[] = [...entries].map(([value, label]) => ({ value, label }))
    if (hasNone) options.push({ value: NONE_FILTER, label: NONE_LABEL })
    return sortOptions(options)
  }

  return {
    warehouses: sortOptions([...warehouses].map(([value, label]) => ({ value, label }))),
    salespeople: toOptions(salespeople, salesRepHasNone),
    vendors: toOptions(vendors, vendorHasNone),
    brands: sortOptions([...brands].map(([value, label]) => ({ value, label }))),
  }
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
    if (!matchesDimension(row.warehouse_id, filters.warehouseId)) continue
    if (!matchesDimension(row.sales_rep_id, filters.salesRepId)) continue
    if (!matchesDimension(row.vendor_id, filters.vendorId)) continue
    if (!matchesDimension(row.brand_id, filters.brandId)) continue
    addMetrics(months[row.month - 1], row)
    addMetrics(totals, row)
  }

  return { months, totals }
}

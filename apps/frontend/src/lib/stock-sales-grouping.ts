import type { StockSalesMode } from '@/lib/filters/parsers'
import { median } from '@/lib/model-price-history-summary'
import type {
  MeterBand,
  ModelSummary,
  StockSalesReport,
  StockSalesRow,
  StockSalesSalePriceGroup,
} from 'shared-types'

type CostTotals = {
  purchase_cost_sum: number | null
  purchase_cost_count: number
  total_cost_sum: number | null
  total_cost_count: number
}

type ModelIdentity = Pick<
  StockSalesRow,
  'brand_id' | 'brand_name' | 'asset_type_id' | 'asset_type' | 'model_id' | 'model_name'
>

export type StockSalesModelRow = ModelIdentity & {
  in_stock_count: number
  held_count: number
  avg_purchase_cost: number | null
  avg_total_cost: number | null
  median_sale_price: number | null
  margin_percent: number | null
  sales_count: number
  profit: number | null
}

export type StockSalesFilters = {
  band: MeterBand | null
  models: ModelSummary[]
}

type StockAccumulator = ModelIdentity &
  CostTotals & {
    in_stock_count: number
    held_count: number
  }

type SalesAccumulator = ModelIdentity & { sale_prices: number[]; profit: number | null }

const NO_SALE_PRICES: number[] = []
const NO_SALE_PRICE_GROUPS: StockSalesSalePriceGroup[] = []
const NOTHING_ON_HAND: Omit<StockAccumulator, keyof ModelIdentity> = {
  in_stock_count: 0,
  held_count: 0,
  purchase_cost_sum: null,
  purchase_cost_count: 0,
  total_cost_sum: null,
  total_cost_count: 0,
}

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

function identityOf(item: ModelIdentity): ModelIdentity {
  return {
    brand_id: item.brand_id,
    brand_name: item.brand_name,
    asset_type_id: item.asset_type_id,
    asset_type: item.asset_type,
    model_id: item.model_id,
    model_name: item.model_name,
  }
}

function buildMatcher(
  filters: StockSalesFilters,
): (item: ModelIdentity & { meter_band: MeterBand }) => boolean {
  const modelIds = new Set(filters.models.map((m) => m.id))
  return (item) =>
    (filters.band === null || item.meter_band === filters.band) &&
    (modelIds.size === 0 || modelIds.has(item.model_id))
}

function accumulateStock(rows: StockSalesRow[]): Map<number, StockAccumulator> {
  const stockByModel = new Map<number, StockAccumulator>()
  for (const row of rows) {
    const existing = stockByModel.get(row.model_id)
    if (existing) {
      existing.in_stock_count += row.in_stock_count
      existing.held_count += row.held_count
      existing.purchase_cost_sum = addNullable(existing.purchase_cost_sum, row.purchase_cost_sum)
      existing.purchase_cost_count += row.purchase_cost_count
      existing.total_cost_sum = addNullable(existing.total_cost_sum, row.total_cost_sum)
      existing.total_cost_count += row.total_cost_count
    } else {
      stockByModel.set(row.model_id, {
        ...identityOf(row),
        in_stock_count: row.in_stock_count,
        held_count: row.held_count,
        purchase_cost_sum: row.purchase_cost_sum,
        purchase_cost_count: row.purchase_cost_count,
        total_cost_sum: row.total_cost_sum,
        total_cost_count: row.total_cost_count,
      })
    }
  }
  return stockByModel
}

function accumulateSales(groups: StockSalesSalePriceGroup[]): Map<number, SalesAccumulator> {
  const salesByModel = new Map<number, SalesAccumulator>()
  for (const group of groups) {
    const existing = salesByModel.get(group.model_id)
    if (existing) {
      existing.sale_prices.push(...group.sale_prices)
      existing.profit = addNullable(existing.profit, group.profit_sum)
    } else {
      salesByModel.set(group.model_id, {
        ...identityOf(group),
        sale_prices: [...group.sale_prices],
        profit: group.profit_sum,
      })
    }
  }
  return salesByModel
}

const NO_SALES: Pick<SalesAccumulator, 'sale_prices' | 'profit'> = {
  sale_prices: NO_SALE_PRICES,
  profit: null,
}

function toModelRow(
  stock: StockAccumulator,
  sales: Pick<SalesAccumulator, 'sale_prices' | 'profit'>,
): StockSalesModelRow {
  const salePrices = sales.sale_prices
  const avgTotalCost = average(stock.total_cost_sum, stock.total_cost_count)
  const medianSalePrice = median(salePrices)
  return {
    ...identityOf(stock),
    in_stock_count: stock.in_stock_count,
    held_count: stock.held_count,
    avg_purchase_cost: average(stock.purchase_cost_sum, stock.purchase_cost_count),
    avg_total_cost: avgTotalCost,
    median_sale_price: medianSalePrice,
    margin_percent: marginPercent(medianSalePrice, avgTotalCost),
    sales_count: salePrices.length,
    profit: sales.profit,
  }
}

export function buildStockSalesGroups(
  report: StockSalesReport,
  filters: StockSalesFilters,
  mode: StockSalesMode,
): StockSalesModelRow[] {
  const matches = buildMatcher(filters)
  const stockByModel = accumulateStock(report.stock.filter(matches))
  const salesByModel = accumulateSales((report.sale_prices ?? NO_SALE_PRICE_GROUPS).filter(matches))

  if (mode === 'stock') {
    return Array.from(stockByModel.values(), (stock) =>
      toModelRow(stock, salesByModel.get(stock.model_id) ?? NO_SALES),
    )
  }
  return Array.from(salesByModel.values(), (sales) =>
    toModelRow(
      stockByModel.get(sales.model_id) ?? { ...identityOf(sales), ...NOTHING_ON_HAND },
      sales,
    ),
  )
}

export type StockSalesTotals = {
  in_stock_count: number
  held_count: number
  sales_count: number
}

export function summarizeStockSales(rows: StockSalesModelRow[]): StockSalesTotals {
  return rows.reduce(
    (totals, row) => ({
      in_stock_count: totals.in_stock_count + row.in_stock_count,
      held_count: totals.held_count + row.held_count,
      sales_count: totals.sales_count + row.sales_count,
    }),
    { in_stock_count: 0, held_count: 0, sales_count: 0 },
  )
}

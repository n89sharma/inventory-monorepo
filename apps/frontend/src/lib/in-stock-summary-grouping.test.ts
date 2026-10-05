import { describe, expect, it } from 'vitest'
import type { InStockSalePriceGroup, InStockSummaryRow, MeterBand } from 'shared-types'
import { buildInStockSummaryGroups } from './in-stock-summary-grouping'

const YYZ = 1
const DFW = 2
const CANON = 10
const COPIER = 20
const IRADX = 100
const IMAGERUNNER = 101
const NO_SALES: InStockSalePriceGroup[] = []
const ALL_BANDS = null

type Stock = {
  warehouse: number
  model: number
  band: MeterBand
  assets: number
  purchaseCosts: (number | null)[]
}

function sold(model: number, band: MeterBand, salePrices: number[]): InStockSalePriceGroup {
  return { model_id: model, meter_band: band, sale_prices: salePrices }
}

function stocked({ warehouse, model, band, assets, purchaseCosts }: Stock): InStockSummaryRow {
  const recorded = purchaseCosts.filter((cost): cost is number => cost !== null)
  const sum = recorded.length === 0 ? null : recorded.reduce((total, cost) => total + cost, 0)
  return {
    warehouse_id: warehouse,
    brand_id: CANON,
    brand_name: 'Canon',
    asset_type_id: COPIER,
    asset_type: 'COPIER',
    model_id: model,
    model_name: `Model ${model}`,
    meter_band: band,
    purchase_cost_sum: sum,
    purchase_cost_count: recorded.length,
    total_cost_sum: sum,
    total_cost_count: recorded.length,
    in_stock_count: assets,
  }
}

describe('buildInStockSummaryGroups', () => {
  it('combines one model across warehouses and meter bands into a single row', () => {
    const groups = buildInStockSummaryGroups(
      [
        stocked({
          warehouse: YYZ,
          model: IRADX,
          band: 'LOW',
          assets: 2,
          purchaseCosts: [100, 100],
        }),
        stocked({ warehouse: DFW, model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [100] }),
        stocked({ warehouse: DFW, model: IRADX, band: 'HIGH', assets: 1, purchaseCosts: [100] }),
        stocked({ warehouse: YYZ, model: IMAGERUNNER, band: 'LOW', assets: 5, purchaseCosts: [] }),
      ],
      NO_SALES,
      ALL_BANDS,
    )
    expect(groups.map((group) => [group.model_id, group.in_stock_count])).toEqual([
      [IRADX, 4],
      [IMAGERUNNER, 5],
    ])
  })

  it('averages over the assets that have a cost, not over every asset', () => {
    const [group] = buildInStockSummaryGroups(
      [
        stocked({
          warehouse: YYZ,
          model: IRADX,
          band: 'LOW',
          assets: 2,
          purchaseCosts: [100, null],
        }),
        stocked({ warehouse: DFW, model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [400] }),
      ],
      NO_SALES,
      ALL_BANDS,
    )
    expect(group.in_stock_count).toBe(3)
    expect(group.avg_purchase_cost).toBe(250)
    expect(group.avg_total_cost).toBe(250)
  })

  it('shows no average when no asset in the model has a cost', () => {
    const [group] = buildInStockSummaryGroups(
      [
        stocked({
          warehouse: YYZ,
          model: IRADX,
          band: 'LOW',
          assets: 2,
          purchaseCosts: [null, null],
        }),
      ],
      NO_SALES,
      ALL_BANDS,
    )
    expect(group.avg_purchase_cost).toBeNull()
  })

  it('shows no average when the cost totals were withheld', () => {
    const redacted = {
      ...stocked({ warehouse: YYZ, model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [100] }),
      purchase_cost_sum: null,
      total_cost_sum: null,
    }
    const [group] = buildInStockSummaryGroups([redacted], NO_SALES, ALL_BANDS)
    expect(group.avg_purchase_cost).toBeNull()
    expect(group.avg_total_cost).toBeNull()
  })
})

describe('buildInStockSummaryGroups sale prices', () => {
  const iradxStock = stocked({
    warehouse: YYZ,
    model: IRADX,
    band: 'LOW',
    assets: 1,
    purchaseCosts: [600],
  })
  const iradxSales = [
    sold(IRADX, 'LOW', [1000, 800]),
    sold(IRADX, 'HIGH', [400]),
    sold(IRADX, 'UNKNOWN', [0, 900]),
  ]

  it('takes the median of every sale of the model when no band is selected', () => {
    const [group] = buildInStockSummaryGroups([iradxStock], iradxSales, ALL_BANDS)
    expect(group.median_sale_price).toBe(800)
    expect(group.sales_count).toBe(5)
  })

  it('takes the median of the selected band only', () => {
    const [group] = buildInStockSummaryGroups([iradxStock], iradxSales, 'LOW')
    expect(group.median_sale_price).toBe(900)
    expect(group.sales_count).toBe(2)
  })

  it('counts sales from every warehouse even when stock from only one is shown', () => {
    const dfwOnlyStock = { ...iradxStock, warehouse_id: DFW }
    const [group] = buildInStockSummaryGroups([dfwOnlyStock], iradxSales, ALL_BANDS)
    expect(group.sales_count).toBe(5)
  })

  it('works out margin % from the median sale price and the average total cost', () => {
    const [group] = buildInStockSummaryGroups([iradxStock], iradxSales, 'LOW')
    expect(group.margin_percent).toBeCloseTo(((900 - 600) / 900) * 100)
  })

  it('shows a negative margin when cost is above the median sale price', () => {
    const [group] = buildInStockSummaryGroups([iradxStock], iradxSales, 'HIGH')
    expect(group.margin_percent).toBe(-50)
  })

  it('leaves the sale price and margin blank when the model had no sales', () => {
    const [group] = buildInStockSummaryGroups([iradxStock], NO_SALES, ALL_BANDS)
    expect(group.median_sale_price).toBeNull()
    expect(group.margin_percent).toBeNull()
    expect(group.sales_count).toBe(0)
  })

  it('leaves the margin blank when the median sale price is $0', () => {
    const [group] = buildInStockSummaryGroups([iradxStock], [sold(IRADX, 'LOW', [0])], ALL_BANDS)
    expect(group.median_sale_price).toBe(0)
    expect(group.margin_percent).toBeNull()
  })

  it('leaves the margin blank when the average total cost was withheld', () => {
    const redacted = { ...iradxStock, purchase_cost_sum: null, total_cost_sum: null }
    const [group] = buildInStockSummaryGroups([redacted], iradxSales, ALL_BANDS)
    expect(group.median_sale_price).toBe(800)
    expect(group.margin_percent).toBeNull()
  })
})

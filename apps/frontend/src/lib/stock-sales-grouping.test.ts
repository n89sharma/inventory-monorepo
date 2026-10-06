import { describe, expect, it } from 'vitest'
import type { MeterBand, ModelSummary, StockSalesRow, StockSalesSalePriceGroup } from 'shared-types'
import {
  buildStockSalesGroups,
  summarizeStockSales,
  type StockSalesFilters,
} from './stock-sales-grouping'

const CANON = 10
const RICOH = 11
const COPIER = 20
const PRINTER = 21
const IRADX = 100
const IMAGERUNNER = 101
const MPC = 102
const NO_SALES: StockSalesSalePriceGroup[] = []
const NO_FILTERS: StockSalesFilters = { band: null, models: [] }
const MPC_MODEL: ModelSummary = {
  id: MPC,
  brand_id: RICOH,
  brand_name: 'RICOH',
  model_name: 'MPC',
  asset_type_id: PRINTER,
  asset_type: 'PRINTER',
  weight: 0,
  size: 0,
  is_colour: false,
}
const ONLY_MPC: StockSalesFilters = { ...NO_FILTERS, models: [MPC_MODEL] }

type Identity = { model: number; brand?: number; type?: number }

type Stock = Identity & {
  band: MeterBand
  assets: number
  held?: number
  purchaseCosts: (number | null)[]
}

function identity({ model, brand = CANON, type = COPIER }: Identity) {
  return {
    brand_id: brand,
    brand_name: `Brand ${brand}`,
    asset_type_id: type,
    asset_type: `Type ${type}`,
    model_id: model,
    model_name: `Model ${model}`,
  }
}

function sold(
  item: Identity,
  band: MeterBand,
  salePrices: number[],
  profit: number | null = null,
): StockSalesSalePriceGroup {
  return { ...identity(item), meter_band: band, sale_prices: salePrices, profit_sum: profit }
}

function stocked({ band, assets, held = 0, purchaseCosts, ...item }: Stock): StockSalesRow {
  const recorded = purchaseCosts.filter((cost): cost is number => cost !== null)
  const sum = recorded.length === 0 ? null : recorded.reduce((total, cost) => total + cost, 0)
  return {
    ...identity(item),
    meter_band: band,
    purchase_cost_sum: sum,
    purchase_cost_count: recorded.length,
    total_cost_sum: sum,
    total_cost_count: recorded.length,
    in_stock_count: assets,
    held_count: held,
  }
}

function stockMode(stock: StockSalesRow[], sales = NO_SALES, filters = NO_FILTERS) {
  return buildStockSalesGroups({ stock, sale_prices: sales }, filters, 'stock')
}

function soldMode(stock: StockSalesRow[], sales: StockSalesSalePriceGroup[], filters = NO_FILTERS) {
  return buildStockSalesGroups({ stock, sale_prices: sales }, filters, 'sold')
}

describe('buildStockSalesGroups stock mode', () => {
  it('combines one model across meter bands into a single row', () => {
    const groups = stockMode([
      stocked({ model: IRADX, band: 'LOW', assets: 3, purchaseCosts: [100, 100, 100] }),
      stocked({ model: IRADX, band: 'HIGH', assets: 1, purchaseCosts: [100] }),
      stocked({ model: IMAGERUNNER, band: 'LOW', assets: 5, purchaseCosts: [] }),
    ])
    expect(groups.map((group) => [group.model_id, group.in_stock_count])).toEqual([
      [IRADX, 4],
      [IMAGERUNNER, 5],
    ])
  })

  it('adds up held units across meter bands', () => {
    const [group] = stockMode([
      stocked({ model: IRADX, band: 'LOW', assets: 2, held: 1, purchaseCosts: [] }),
      stocked({ model: IRADX, band: 'HIGH', assets: 0, held: 3, purchaseCosts: [] }),
    ])
    expect(group).toMatchObject({ in_stock_count: 2, held_count: 4 })
  })

  it('averages over the assets that have a cost, not over every asset', () => {
    const [group] = stockMode([
      stocked({ model: IRADX, band: 'LOW', assets: 2, purchaseCosts: [100, null] }),
      stocked({ model: IRADX, band: 'HIGH', assets: 1, purchaseCosts: [400] }),
    ])
    expect(group.in_stock_count).toBe(3)
    expect(group.avg_purchase_cost).toBe(250)
    expect(group.avg_total_cost).toBe(250)
  })

  it('shows no average when no asset in the model has a cost', () => {
    const [group] = stockMode([
      stocked({ model: IRADX, band: 'LOW', assets: 2, purchaseCosts: [null, null] }),
    ])
    expect(group.avg_purchase_cost).toBeNull()
  })

  it('shows no average when the cost totals were withheld', () => {
    const redacted = {
      ...stocked({ model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [100] }),
      purchase_cost_sum: null,
      total_cost_sum: null,
    }
    const [group] = stockMode([redacted])
    expect(group.avg_purchase_cost).toBeNull()
    expect(group.avg_total_cost).toBeNull()
  })

  it('lists only models with on-hand units', () => {
    const groups = stockMode(
      [stocked({ model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [] })],
      [sold({ model: IMAGERUNNER }, 'LOW', [500])],
    )
    expect(groups.map((group) => group.model_id)).toEqual([IRADX])
  })

  it('applies the band and model filters to stock', () => {
    const stock = [
      stocked({ model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [] }),
      stocked({ model: IRADX, band: 'HIGH', assets: 2, purchaseCosts: [] }),
      stocked({
        model: MPC,
        brand: RICOH,
        type: PRINTER,
        band: 'LOW',
        assets: 4,
        purchaseCosts: [],
      }),
    ]
    const [highOnly] = stockMode(stock, NO_SALES, { ...NO_FILTERS, band: 'HIGH' })
    expect(highOnly).toMatchObject({ model_id: IRADX, in_stock_count: 2 })

    expect(stockMode(stock, NO_SALES, ONLY_MPC).map((group) => group.model_id)).toEqual([MPC])
  })
})

describe('buildStockSalesGroups sale prices', () => {
  const iradxStock = stocked({ model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [600] })
  const iradxSales = [
    sold({ model: IRADX }, 'LOW', [1000, 800]),
    sold({ model: IRADX }, 'HIGH', [400]),
    sold({ model: IRADX }, 'UNKNOWN', [0, 900]),
  ]
  const band = (meterBand: MeterBand) => ({ ...NO_FILTERS, band: meterBand })

  it('takes the median of every sale of the model when no band is selected', () => {
    const [group] = stockMode([iradxStock], iradxSales)
    expect(group.median_sale_price).toBe(800)
    expect(group.sales_count).toBe(5)
  })

  it('takes the median of the selected band only', () => {
    const lowStock = { ...iradxStock, meter_band: 'LOW' as const }
    const [group] = stockMode([lowStock], iradxSales, band('LOW'))
    expect(group.median_sale_price).toBe(900)
    expect(group.sales_count).toBe(2)
  })

  it('works out margin % from the median sale price and the average total cost', () => {
    const [group] = stockMode([iradxStock], iradxSales, band('LOW'))
    expect(group.margin_percent).toBeCloseTo(((900 - 600) / 900) * 100)
  })

  it('shows a negative margin when cost is above the median sale price', () => {
    const highStock = { ...iradxStock, meter_band: 'HIGH' as const }
    const [group] = stockMode([highStock], iradxSales, band('HIGH'))
    expect(group.margin_percent).toBe(-50)
  })

  it('leaves the sale price and margin blank when the model had no sales', () => {
    const [group] = stockMode([iradxStock])
    expect(group.median_sale_price).toBeNull()
    expect(group.margin_percent).toBeNull()
    expect(group.sales_count).toBe(0)
  })

  it('leaves the margin blank when the median sale price is $0', () => {
    const [group] = stockMode([iradxStock], [sold({ model: IRADX }, 'LOW', [0])])
    expect(group.median_sale_price).toBe(0)
    expect(group.margin_percent).toBeNull()
  })

  it('leaves the margin blank when the average total cost was withheld', () => {
    const redacted = { ...iradxStock, purchase_cost_sum: null, total_cost_sum: null }
    const [group] = stockMode([redacted], iradxSales)
    expect(group.median_sale_price).toBe(800)
    expect(group.margin_percent).toBeNull()
  })
})

describe('buildStockSalesGroups sold mode', () => {
  it('lists a model with sales but nothing on hand, with zero counts and blank costs', () => {
    const [group] = soldMode([], [sold({ model: MPC, brand: RICOH }, 'LOW', [500, 700], 300)])
    expect(group).toEqual({
      ...identity({ model: MPC, brand: RICOH }),
      in_stock_count: 0,
      held_count: 0,
      avg_purchase_cost: null,
      avg_total_cost: null,
      median_sale_price: 600,
      margin_percent: null,
      sales_count: 2,
      profit: 300,
    })
  })

  it('leaves out a model with on-hand units but no sales', () => {
    const groups = soldMode(
      [stocked({ model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [] })],
      [sold({ model: MPC }, 'LOW', [500])],
    )
    expect(groups.map((group) => group.model_id)).toEqual([MPC])
  })

  it('lists only models with a sale in the selected band', () => {
    const groups = soldMode(
      [],
      [sold({ model: IRADX }, 'HIGH', [400]), sold({ model: MPC }, 'LOW', [500])],
      { ...NO_FILTERS, band: 'HIGH' },
    )
    expect(groups.map((group) => group.model_id)).toEqual([IRADX])
  })

  it('applies the model filter', () => {
    const sales = [
      sold({ model: IRADX }, 'LOW', [400]),
      sold({ model: MPC, brand: RICOH, type: PRINTER }, 'LOW', [500]),
    ]
    expect(soldMode([], sales, ONLY_MPC).map((group) => group.model_id)).toEqual([MPC])
  })

  it('shows the same figures for a model in both modes', () => {
    const stock = [stocked({ model: IRADX, band: 'LOW', assets: 2, held: 1, purchaseCosts: [300] })]
    const sales = [sold({ model: IRADX }, 'LOW', [1000, 800])]
    expect(soldMode(stock, sales)).toEqual(stockMode(stock, sales))
  })
})

describe('summarizeStockSales', () => {
  it('sums in-stock, held and sales counts over the given rows', () => {
    const rows = stockMode(
      [
        stocked({ model: IRADX, band: 'LOW', assets: 2, held: 1, purchaseCosts: [] }),
        stocked({ model: MPC, band: 'LOW', assets: 3, held: 4, purchaseCosts: [] }),
      ],
      [sold({ model: IRADX }, 'LOW', [500, 600]), sold({ model: MPC }, 'HIGH', [700])],
    )
    expect(summarizeStockSales(rows)).toEqual({ in_stock_count: 5, held_count: 5, sales_count: 3 })
  })

  it('is zero for no rows', () => {
    expect(summarizeStockSales([])).toEqual({ in_stock_count: 0, held_count: 0, sales_count: 0 })
  })
})

describe('buildStockSalesGroups profit', () => {
  const iradxStock = stocked({ model: IRADX, band: 'LOW', assets: 1, purchaseCosts: [] })
  const iradxSales = [
    sold({ model: IRADX }, 'LOW', [1000], 400),
    sold({ model: IRADX }, 'HIGH', [500], -100),
  ]

  it('adds up profit across meter bands', () => {
    const [group] = stockMode([iradxStock], iradxSales)
    expect(group.profit).toBe(300)
  })

  it('takes the profit of the selected band only', () => {
    const highStock = { ...iradxStock, meter_band: 'HIGH' as const }
    const [group] = soldMode([highStock], iradxSales, { ...NO_FILTERS, band: 'HIGH' })
    expect(group.profit).toBe(-100)
  })

  it('leaves profit blank when it was withheld or there were no sales', () => {
    const withheld = [sold({ model: IRADX }, 'LOW', [1000])]
    expect(stockMode([iradxStock], withheld)[0].profit).toBeNull()
    expect(stockMode([iradxStock])[0].profit).toBeNull()
  })
})

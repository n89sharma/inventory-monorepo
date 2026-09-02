import { describe, expect, it } from 'vitest'
import type { ProfitabilityCubeRow } from 'shared-types'
import { aggregateCube, type ProfitabilityFilters } from './profitability-aggregate'

const YEAR = 2025
const MARCH = 3
const JULY = 7

const WEST = 100
const ACME = 1
const GLOBEX = 2
const CANON = 10
const RICOH = 11
const TRADE_IN_VENDOR = 50
const DANA = 500

type Sale = {
  month: number
  customer: number
  brand: number
  units: number
  revenue: number
  cost: number
  salesRep?: number | null
}

function sold({
  month,
  customer,
  brand,
  units,
  revenue,
  cost,
  salesRep = DANA,
}: Sale): ProfitabilityCubeRow {
  return {
    warehouse_id: WEST,
    sales_rep_id: salesRep,
    vendor_id: TRADE_IN_VENDOR,
    customer_id: customer,
    brand_id: brand,
    month,
    asset_count: units,
    cogs: cost,
    gross_revenue: revenue,
    gross_margin: revenue - cost,
  }
}

// Everything that departed in 2025, in the order it happened.
const LEDGER: ProfitabilityCubeRow[] = [
  sold({ month: MARCH, customer: ACME, brand: CANON, units: 2, revenue: 5000, cost: 3000 }),
  sold({ month: MARCH, customer: GLOBEX, brand: CANON, units: 1, revenue: 4000, cost: 2500 }),
  sold({
    month: JULY,
    customer: ACME,
    brand: RICOH,
    units: 3,
    revenue: 9000,
    cost: 6000,
    salesRep: null,
  }),
]

const NO_FILTERS: ProfitabilityFilters = {
  year: YEAR,
  warehouseIds: [],
  salesRepId: null,
  vendorId: null,
  customerId: null,
  brandId: null,
}

function monthOf(rows: ReturnType<typeof aggregateCube>, month: number) {
  return rows.months[month - 1]
}

describe('aggregateCube', () => {
  it('sums the whole ledger when nothing is filtered', () => {
    const table = aggregateCube(LEDGER, NO_FILTERS)

    expect(table.totals).toEqual({
      asset_count: 6,
      gross_revenue: 18000,
      cogs: 11500,
      gross_margin: 6500,
    })
    expect(monthOf(table, MARCH)).toMatchObject({ asset_count: 3, gross_revenue: 9000 })
    expect(monthOf(table, JULY)).toMatchObject({ asset_count: 3, gross_revenue: 9000 })
  })

  it('always returns twelve months, zeroed where nothing departed', () => {
    const table = aggregateCube(LEDGER, NO_FILTERS)

    expect(table.months).toHaveLength(12)
    expect(table.months.map((month) => month.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
    expect(monthOf(table, 1)).toEqual({
      month: 1,
      asset_count: 0,
      gross_revenue: 0,
      cogs: 0,
      gross_margin: 0,
    })
  })

  it('keeps only what one customer bought', () => {
    const table = aggregateCube(LEDGER, { ...NO_FILTERS, customerId: ACME })

    expect(table.totals).toEqual({
      asset_count: 5,
      gross_revenue: 14000,
      cogs: 9000,
      gross_margin: 5000,
    })
    expect(monthOf(table, MARCH).asset_count).toBe(2)
    expect(monthOf(table, JULY).asset_count).toBe(3)
  })

  it('composes customer and brand as AND', () => {
    const table = aggregateCube(LEDGER, { ...NO_FILTERS, customerId: ACME, brandId: CANON })

    expect(table.totals).toMatchObject({ asset_count: 2, gross_revenue: 5000 })
    expect(monthOf(table, JULY).asset_count).toBe(0)
  })

  it('reports an empty year for a customer that bought nothing', () => {
    const table = aggregateCube(LEDGER, { ...NO_FILTERS, customerId: 999 })

    expect(table.totals).toEqual({ asset_count: 0, gross_revenue: 0, cogs: 0, gross_margin: 0 })
    expect(table.months.every((month) => month.asset_count === 0)).toBe(true)
  })

  // A sale with no rep recorded cannot belong to any rep, so filtering by one drops it.
  it('drops rows with no sales rep when a rep is selected', () => {
    const table = aggregateCube(LEDGER, { ...NO_FILTERS, salesRepId: DANA })

    expect(table.totals.asset_count).toBe(3)
    expect(monthOf(table, JULY).asset_count).toBe(0)
  })
})

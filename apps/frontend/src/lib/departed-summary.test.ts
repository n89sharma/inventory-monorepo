import { describe, expect, it } from 'vitest'
import { summariseDepartedAssets } from './departed-summary'

const asset = (cost_sale_price: number | null, cost_total_cost: number | null) => ({
  cost_sale_price,
  cost_total_cost,
})

describe('summariseDepartedAssets', () => {
  it('sums revenue and cost, and derives the margin', () => {
    const summary = summariseDepartedAssets([asset(1400, 1000), asset(600, 400)])
    expect(summary.grossRevenue).toBe(2000)
    expect(summary.cogs).toBe(1400)
    expect(summary.grossMargin).toBe(600)
    expect(summary.marginPercent).toBeCloseTo(30)
  })

  // An asset without a sale price has not been sold, so it contributes nothing either way.
  it('excludes assets carrying no sale price from the money totals', () => {
    const summary = summariseDepartedAssets([asset(1400, 1000), asset(null, 800), asset(0, 900)])
    expect(summary.grossRevenue).toBe(1400)
    expect(summary.cogs).toBe(1000)
    expect(summary.grossMargin).toBe(400)
    expect(summary.pricedAssets).toBe(1)
  })

  // Costs are written by the time an asset has a sale price, so a zero or absent cost is a
  // real costless sale rather than a half-priced row. The report counts these the same way.
  it('counts a sale with no recorded cost as pure margin', () => {
    const summary = summariseDepartedAssets([asset(700, 0), asset(5000, null)])
    expect(summary.grossRevenue).toBe(5700)
    expect(summary.cogs).toBe(0)
    expect(summary.grossMargin).toBe(5700)
    expect(summary.marginPercent).toBeCloseTo(100)
    expect(summary.pricedAssets).toBe(2)
  })

  // The strip renders these as "2 / 3 priced", so both halves have to be right.
  it('counts every displayed asset, priced or not', () => {
    const summary = summariseDepartedAssets([
      asset(1400, 1000),
      asset(5000, null),
      asset(null, null),
    ])
    expect(summary.totalAssets).toBe(3)
    expect(summary.pricedAssets).toBe(2)
  })

  it('reports a negative margin when the assets sold below cost', () => {
    const summary = summariseDepartedAssets([asset(800, 1000)])
    expect(summary.grossMargin).toBe(-200)
    expect(summary.marginPercent).toBeCloseTo(-25)
  })

  it('reports zeroes for an empty list rather than dividing by zero', () => {
    const summary = summariseDepartedAssets([])
    expect(summary).toEqual({
      totalAssets: 0,
      pricedAssets: 0,
      grossRevenue: 0,
      cogs: 0,
      grossMargin: 0,
      marginPercent: 0,
    })
  })

  it('reports zeroes when nothing in the list was sold', () => {
    const summary = summariseDepartedAssets([asset(null, null), asset(null, 5000)])
    expect(summary.totalAssets).toBe(2)
    expect(summary.pricedAssets).toBe(0)
    expect(summary.marginPercent).toBe(0)
  })
})

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

  // Half-priced assets would otherwise inflate the margin: counting a sale price whose cost
  // is unknown makes the whole sale look like profit.
  it('excludes assets missing either price from the money totals', () => {
    const summary = summariseDepartedAssets([
      asset(1400, 1000),
      asset(5000, null),
      asset(null, 800),
      asset(0, 900),
      asset(700, 0),
    ])
    expect(summary.grossRevenue).toBe(1400)
    expect(summary.cogs).toBe(1000)
    expect(summary.grossMargin).toBe(400)
    expect(summary.pricedAssets).toBe(1)
  })

  // The strip renders these as "1 / 3 priced", so both halves have to be right.
  it('counts every displayed asset, priced or not', () => {
    const summary = summariseDepartedAssets([
      asset(1400, 1000),
      asset(5000, null),
      asset(null, null),
    ])
    expect(summary.totalAssets).toBe(3)
    expect(summary.pricedAssets).toBe(1)
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

  it('reports zeroes when nothing in the list is priced', () => {
    const summary = summariseDepartedAssets([asset(null, null), asset(5000, null)])
    expect(summary.totalAssets).toBe(2)
    expect(summary.marginPercent).toBe(0)
  })
})

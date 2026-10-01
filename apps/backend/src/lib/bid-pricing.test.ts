import { describe, expect, it } from 'vitest'
import { Prisma } from '../../generated/prisma/client.js'
import {
  calculateBidRowPrice,
  isBidRowPriced,
  summariseBidRows,
  type BidRowPricingInput,
} from './bid-pricing.js'

function pricing(
  sellingPrice: number | null,
  transportCost: number | null,
  marginPercent: number | null,
  zeroPriced = false,
): BidRowPricingInput {
  const toDecimal = (value: number | null) => (value === null ? null : new Prisma.Decimal(value))
  return {
    selling_price: toDecimal(sellingPrice),
    transport_cost: toDecimal(transportCost),
    margin_percent: toDecimal(marginPercent),
    zero_priced: zeroPriced,
  }
}

function priced(row: BidRowPricingInput) {
  return { ...row, ...calculateBidRowPrice(row) }
}

function amounts(row: BidRowPricingInput) {
  const price = calculateBidRowPrice(row)
  return { bid: price.bid_price?.toNumber() ?? null, total: price.total_cost?.toNumber() ?? null }
}

describe('calculateBidRowPrice', () => {
  it('takes the margin off the selling price, then the freight', () => {
    expect(amounts(pricing(1000, 100, 20))).toEqual({ bid: 700, total: 800 })
  })

  it('rounds the bid price to cents', () => {
    expect(amounts(pricing(333.33, 10, 12.5))).toEqual({ bid: 281.66, total: 291.66 })
  })

  it('raises a negative bid price to zero and still adds the freight', () => {
    expect(amounts(pricing(100, 150, 20))).toEqual({ bid: 0, total: 150 })
  })

  it('leaves the price empty while selling price, freight or margin is missing', () => {
    expect(amounts(pricing(null, 100, 20))).toEqual({ bid: null, total: null })
    expect(amounts(pricing(1000, null, 20))).toEqual({ bid: null, total: null })
    expect(amounts(pricing(1000, 100, null))).toEqual({ bid: null, total: null })
  })

  it('prices a zero-priced row at nothing whatever else it holds', () => {
    expect(amounts(pricing(1000, 100, 20, true))).toEqual({ bid: 0, total: 0 })
    expect(amounts(pricing(null, null, null, true))).toEqual({ bid: 0, total: 0 })
  })
})

describe('isBidRowPriced', () => {
  it('counts zero freight as entered', () => {
    expect(isBidRowPriced(pricing(1000, 0, 20))).toBe(true)
  })

  it('needs every input unless the row is zero-priced', () => {
    expect(isBidRowPriced(pricing(1000, 100, null))).toBe(false)
    expect(isBidRowPriced(pricing(null, null, null, true))).toBe(true)
  })
})

describe('summariseBidRows', () => {
  it('adds total cost and expected sale, leaving zero-priced and unpriced rows out of the sale', () => {
    const rows = [
      priced(pricing(1000, 100, 20)),
      priced(pricing(1000, 100, 20)),
      priced(pricing(500, 50, 10, true)),
      priced(pricing(800, null, 20)),
    ]
    expect(summariseBidRows(rows)).toEqual({
      total_cost: 1600,
      expected_sale: 2000,
      expected_margin: 400,
      unpriced_count: 1,
    })
  })

  it('summarises an empty bid as zero', () => {
    expect(summariseBidRows([])).toEqual({
      total_cost: 0,
      expected_sale: 0,
      expected_margin: 0,
      unpriced_count: 0,
    })
  })
})

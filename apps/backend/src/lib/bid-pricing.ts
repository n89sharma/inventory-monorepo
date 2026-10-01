import type { BidTotals } from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import { ZERO } from './decimal.js'

const PERCENT = new Prisma.Decimal(100)
const ONE = new Prisma.Decimal(1)
const CENTS = 2

export type BidRowPricingInput = {
  selling_price: Prisma.Decimal | null
  transport_cost: Prisma.Decimal | null
  margin_percent: Prisma.Decimal | null
  zero_priced: boolean
}

export type BidRowPrice = {
  bid_price: Prisma.Decimal | null
  total_cost: Prisma.Decimal | null
}

type PricedBidRow = BidRowPricingInput & BidRowPrice

export function isBidRowPriced(row: BidRowPricingInput): boolean {
  if (row.zero_priced) return true
  return row.selling_price !== null && row.transport_cost !== null && row.margin_percent !== null
}

export function calculateBidRowPrice(row: BidRowPricingInput): BidRowPrice {
  if (row.zero_priced) return { bid_price: ZERO, total_cost: ZERO }
  const { selling_price, transport_cost, margin_percent } = row
  if (selling_price === null || transport_cost === null || margin_percent === null) {
    return { bid_price: null, total_cost: null }
  }
  const keptShare = ONE.sub(margin_percent.div(PERCENT))
  const rawBidPrice = selling_price.mul(keptShare).sub(transport_cost)
  const bidPrice = Prisma.Decimal.max(rawBidPrice, ZERO).toDecimalPlaces(CENTS)
  return { bid_price: bidPrice, total_cost: bidPrice.add(transport_cost) }
}

export function calculateBidRowMargin(row: PricedBidRow): Prisma.Decimal | null {
  if (row.zero_priced || row.selling_price === null || row.total_cost === null) return null
  return row.selling_price.sub(row.total_cost)
}

export function summariseBidRows(rows: PricedBidRow[]): BidTotals {
  let totalCost = ZERO
  let expectedSale = ZERO
  let unpricedCount = 0
  for (const row of rows) {
    if (!isBidRowPriced(row)) {
      unpricedCount += 1
      continue
    }
    totalCost = totalCost.add(row.total_cost ?? ZERO)
    if (!row.zero_priced) expectedSale = expectedSale.add(row.selling_price ?? ZERO)
  }
  return {
    total_cost: totalCost.toNumber(),
    expected_sale: expectedSale.toNumber(),
    expected_margin: expectedSale.sub(totalCost).toNumber(),
    unpriced_count: unpricedCount,
  }
}

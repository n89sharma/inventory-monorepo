import { describe, expect, it } from 'vitest'
import type { ModelPriceHistoryRow } from 'shared-types'
import { filterByMonths, summarizeBands } from './model-price-history-summary'

const NOW = new Date(2026, 9, 5, 14, 30)
const WINDOW_START = '2026-04-05'
const DAY_BEFORE_WINDOW_START = '2026-04-04'
const LOW_METER = 10_000
const HIGH_METER = 300_000

function sale(salePrice: number, meter: number | null, departedAt = WINDOW_START) {
  return {
    barcode: `B${salePrice}`,
    arrived_at: null,
    departed_at: departedAt,
    purchase_price: null,
    sale_price: salePrice,
    meter,
    vendor: null,
    customer: null,
    salesperson: null,
    cassettes: null,
    internal_finisher: null,
    core_functions: [],
  } satisfies ModelPriceHistoryRow
}

function bandByName(sales: ModelPriceHistoryRow[], name: string) {
  return summarizeBands(sales).find((band) => band.name === name)
}

const ONE_MONTH_WINDOW_START = '2026-09-05'
const DAY_BEFORE_ONE_MONTH_WINDOW_START = '2026-09-04'

describe('filterByMonths', () => {
  it('includes a sale on a 1-month window start date and excludes one the day before', () => {
    const onStart = sale(500, LOW_METER, ONE_MONTH_WINDOW_START)
    const dayBefore = sale(700, LOW_METER, DAY_BEFORE_ONE_MONTH_WINDOW_START)
    expect(filterByMonths([onStart, dayBefore], 1, NOW)).toEqual([onStart])
  })

  it('includes a sale on the window start date and excludes one the day before', () => {
    const onStart = sale(500, LOW_METER, WINDOW_START)
    const dayBefore = sale(700, LOW_METER, DAY_BEFORE_WINDOW_START)
    expect(filterByMonths([onStart, dayBefore], 6, NOW)).toEqual([onStart])
  })
})

describe('summarizeBands', () => {
  const sales = [sale(1000, LOW_METER), sale(400, HIGH_METER), sale(0, null), sale(900, null)]

  it('puts sales with no meter reading in the Unknown row', () => {
    expect(bandByName(sales, 'Unknown')).toMatchObject({ count: 2, saleMedian: 450 })
  })

  it('takes the median of every sale, meterless ones included, in the All row', () => {
    expect(bandByName(sales, 'All')).toMatchObject({ count: 4, saleMedian: 650 })
  })

  it('counts $0 sales in the medians', () => {
    expect(
      bandByName([sale(0, LOW_METER), sale(0, LOW_METER), sale(900, LOW_METER)], 'Low count'),
    ).toMatchObject({ count: 3, saleMedian: 0 })
  })
})

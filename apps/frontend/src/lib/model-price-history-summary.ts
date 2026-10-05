import type { PriceHistoryRange } from '@/lib/filters/hooks'
import { formatDateParam } from '@/lib/date-param'
import { isBefore, parseISO, startOfDay, subMonths } from 'date-fns'
import type { ModelPriceHistoryRow } from 'shared-types'

export const METER_BANDS = [
  { name: 'Low count', label: '<70K', min: null, max: 70_000 },
  { name: 'Med count', label: '70-210K', min: 70_000, max: 210_000 },
  { name: 'High count', label: '210K+', min: 210_000, max: null },
] as const satisfies readonly {
  name: string
  label: string
  min: number | null
  max: number | null
}[]

const UNKNOWN_BAND = { name: 'Unknown', label: 'No reading' }
const ALL_BANDS = { name: 'All', label: '' }

export type BandSummary = {
  name: string
  label: string
  count: number
  purchaseMedian: number | null
  saleMedian: number | null
}

export function salesWindowStart(months: PriceHistoryRange, now: Date = new Date()): string {
  return formatDateParam(startOfDay(subMonths(now, months)))
}

export function filterByMonths(
  sales: ModelPriceHistoryRow[],
  months: PriceHistoryRange,
  now: Date = new Date(),
): ModelPriceHistoryRow[] {
  const windowStart = parseISO(salesWindowStart(months, now))
  return sales.filter((sale) => !isBefore(parseISO(sale.departed_at), windowStart))
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function isInBand(meter: number, band: { min: number | null; max: number | null }): boolean {
  if (band.min !== null && meter < band.min) return false
  if (band.max !== null && meter >= band.max) return false
  return true
}

function summarize(
  band: { name: string; label: string },
  sales: ModelPriceHistoryRow[],
): BandSummary {
  const purchasePrices = sales
    .map((sale) => sale.purchase_price)
    .filter((price): price is number => price !== null)
  return {
    name: band.name,
    label: band.label,
    count: sales.length,
    purchaseMedian: median(purchasePrices),
    saleMedian: median(sales.map((sale) => sale.sale_price)),
  }
}

export function summarizeBands(sales: ModelPriceHistoryRow[]): BandSummary[] {
  const meteredBands = METER_BANDS.map((band) =>
    summarize(
      band,
      sales.filter((sale) => sale.meter !== null && isInBand(sale.meter, band)),
    ),
  )
  return [
    ...meteredBands,
    summarize(
      UNKNOWN_BAND,
      sales.filter((sale) => sale.meter === null),
    ),
    summarize(ALL_BANDS, sales),
  ]
}

import type { SoldReportRange } from '@/lib/sold-report-params'
import { isAfter, subMonths } from 'date-fns'
import type { ModelSaleRow } from 'shared-types'

export const METER_BANDS = [
  { name: 'Low count', label: '<70K', min: null, max: 70_000 },
  { name: 'Med count', label: '70-210K', min: 70_000, max: 210_000 },
  { name: 'High count', label: '>210K', min: 210_000, max: null },
] as const satisfies readonly {
  name: string
  label: string
  min: number | null
  max: number | null
}[]

export type BandSummary = {
  name: string
  label: string
  count: number
  median: number | null
}

export function filterByMonths(
  sales: ModelSaleRow[],
  months: SoldReportRange,
  now: Date = new Date(),
): ModelSaleRow[] {
  const cutoff = subMonths(now, months)
  return sales.filter((sale) => isAfter(sale.departed_at, cutoff))
}

function median(values: number[]): number | null {
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

export function summarizeBands(sales: ModelSaleRow[]): BandSummary[] {
  return METER_BANDS.map((band) => {
    const prices = sales
      .filter((sale) => sale.meter !== null && isInBand(sale.meter, band))
      .map((sale) => sale.sale_price)
    return {
      name: band.name,
      label: band.label,
      count: prices.length,
      median: median(prices),
    }
  })
}

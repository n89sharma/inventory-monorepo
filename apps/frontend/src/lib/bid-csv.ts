import type { CsvColumn } from '@/lib/csv'
import type { BidDetail, BidRow } from 'shared-types'

const NO_BID_EXPORT_VALUE = 'Yes'

function amountText(value: number | null): string {
  return value === null ? '' : value.toFixed(2)
}

function pastedHeader(header: string, index: number): string {
  return header === '' ? `Column ${index + 1}` : header
}

const PRICING_CSV_COLUMNS: CsvColumn<BidRow>[] = [
  { header: 'Selling Price', value: (row) => amountText(row.selling_price) },
  { header: 'Freight', value: (row) => amountText(row.transport_cost) },
  { header: 'Margin %', value: (row) => amountText(row.margin_percent) },
  { header: 'Margin', value: (row) => amountText(row.margin_amount) },
  { header: 'Bid Price', value: (row) => amountText(row.bid_price) },
  { header: 'No Bid', value: (row) => (row.zero_priced ? NO_BID_EXPORT_VALUE : '') },
]

export function bidCsvColumns(bid: BidDetail): CsvColumn<BidRow>[] {
  const pasted = bid.headers.map((header, index) => ({
    header: pastedHeader(header, index),
    value: (row: BidRow) => row.cells[index] ?? '',
  }))
  return [...pasted, ...PRICING_CSV_COLUMNS]
}

export function bidCsvFilename(bid: BidDetail): string {
  return `${bid.bid_number}.csv`
}

import { labelBidColumns, parseBidMeterReading } from '@/lib/bid-column-labels'
import type { CsvColumn } from '@/lib/csv'
import { BID_COLUMN_ROLE, type BidDetail, type BidRow } from 'shared-types'

const NO_BID_EXPORT_VALUE = 'Yes'

function meterText(text: string): string {
  const reading = parseBidMeterReading(text)
  return reading === null ? text : String(reading)
}

function amountText(value: number | null): string {
  return value === null ? '' : value.toFixed(2)
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
  const pasted = labelBidColumns(bid).map((column) => {
    const cellText = (row: BidRow) => row.cells[column.index] ?? ''
    if (column.role === BID_COLUMN_ROLE.TOTAL_METER) {
      return { header: column.label, value: (row: BidRow) => meterText(cellText(row)) }
    }
    return { header: column.label, value: cellText }
  })
  return [...pasted, ...PRICING_CSV_COLUMNS]
}

export function bidCsvFilename(bid: BidDetail): string {
  return `${bid.bid_number}.csv`
}

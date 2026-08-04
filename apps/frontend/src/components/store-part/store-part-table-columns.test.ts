import {
  toSummaryCsvColumns,
  visibleSummaryColumns,
} from '@/components/table-columns/summary-column'
import { toCsv } from '@/lib/csv'
import { describe, expect, it } from 'vitest'
import type { Permission, StorePartSummary } from 'shared-types'
import { STORE_PART_COLUMNS } from './store-part-table-columns'

const ALLOW_ALL = () => true
const DENY_PURCHASE_PRICE = (permission: Permission) => permission !== 'view_purchase_price'

function makeRow(overrides: Partial<StorePartSummary> = {}): StorePartSummary {
  return {
    id: 1,
    part_number: 'PN-1',
    description: 'Fuser assembly',
    warehouse_id: 1,
    warehouse_code: 'YYZ',
    on_hand: 7,
    stock_value: 1234.56,
    // Local-time construction: a UTC instant would shift the rendered day by timezone.
    last_updated: new Date(2026, 2, 4),
    ...overrides,
  }
}

function csvFor(rows: StorePartSummary[], can: (permission: Permission) => boolean): string[] {
  const columns = toSummaryCsvColumns(visibleSummaryColumns(STORE_PART_COLUMNS, can))
  return toCsv(columns, rows).split('\r\n')
}

describe('STORE_PART_COLUMNS csv export', () => {
  it('exports every column with the formatting shown in the table', () => {
    const [header, row] = csvFor([makeRow()], ALLOW_ALL)

    expect(header).toBe('Part #,Description,Warehouse,On hand,Last updated,Value')
    expect(row).toBe('PN-1,Fuser assembly,YYZ,7,"March 04, 2026","$1,234.56"')
  })

  it('omits the value column without view_purchase_price', () => {
    const [header, row] = csvFor([makeRow()], DENY_PURCHASE_PRICE)

    expect(header).toBe('Part #,Description,Warehouse,On hand,Last updated')
    expect(row).not.toContain('1,234.56')
  })

  it('quotes and escapes a description containing a comma and a quote', () => {
    const [, row] = csvFor([makeRow({ description: 'Drum, 24" belt' })], ALLOW_ALL)

    expect(row).toContain('"Drum, 24"" belt"')
  })

  it('renders a zero stock value rather than an empty cell', () => {
    const [, row] = csvFor([makeRow({ stock_value: 0 })], ALLOW_ALL)

    expect(row).toContain('$0.00')
  })
})

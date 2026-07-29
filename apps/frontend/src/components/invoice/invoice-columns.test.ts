import { toCsv } from '@/lib/csv'
import {
  toSummaryCsvColumns,
  visibleSummaryColumns,
} from '@/components/table-columns/summary-column'
import { describe, expect, it } from 'vitest'
import { INVOICE_TYPE, type InvoiceSummary, type Permission } from 'shared-types'
import { INVOICE_COLUMNS_BY_TYPE } from './invoice-columns'

const PURCHASE_INVOICE: InvoiceSummary = {
  id: 1,
  created_at: new Date('2026-03-04T00:00:00Z'),
  created_by: 'Jane Doe',
  asset_count: 7,
  copier_count: 3,
  finisher_count: 2,
  accessory_count: 1,
  other_count: 1,
  invoice_number: 'INV-1',
  invoice_reference: 'ACME-889',
  organization: 'acme copiers',
  is_cleared: true,
  invoice_type: INVOICE_TYPE.purchase,
  invoice_date: '2026-03-04',
  notes: 'Split, over two trucks',
  destination_codes: ['TOR', 'MTL'],
  arrival_numbers: ['ARR-1', 'ARR-2'],
  transporters: ['Speedy'],
  purchase_cost: 1200,
  transport_cost: 300,
  total_cost: 1500,
  sale_price: null,
}

const ALLOW_ALL = () => true
const DENY_PRICES = (permission: Permission) =>
  permission !== 'view_purchase_price' && permission !== 'view_sale_price'

function csvColumnsFor(
  invoiceType: keyof typeof INVOICE_COLUMNS_BY_TYPE,
  can: (permission: Permission) => boolean,
) {
  return toSummaryCsvColumns(visibleSummaryColumns(INVOICE_COLUMNS_BY_TYPE[invoiceType], can))
}

function headersFor(
  invoiceType: keyof typeof INVOICE_COLUMNS_BY_TYPE,
  can: (permission: Permission) => boolean,
): string[] {
  return csvColumnsFor(invoiceType, can).map((column) => column.header)
}

function valueFor(header: string): string {
  const column = csvColumnsFor(INVOICE_TYPE.purchase, ALLOW_ALL).find((c) => c.header === header)
  if (!column) throw new Error(`No CSV column headed ${header}`)
  return column.value(PURCHASE_INVOICE)
}

describe('invoice summary CSV columns', () => {
  it('exports the purchase columns in table order', () => {
    expect(headersFor(INVOICE_TYPE.purchase, ALLOW_ALL)).toEqual([
      'Date',
      'Reference Invoice Number',
      'Vendor',
      'Warehouse',
      'Arrival IDs',
      'Transporters',
      'Cleared',
      'Purchase Cost',
      'Transport Cost',
      'Total Cost',
      'Sale Price',
      'Notes',
      'Total',
      'Created By',
    ])
  })

  it('renders a cleared flag as Yes and joins the array columns', () => {
    expect(valueFor('Cleared')).toBe('Yes')
    expect(valueFor('Warehouse')).toBe('TOR, MTL')
    expect(valueFor('Arrival IDs')).toBe('ARR-1, ARR-2')
  })

  it('quotes the joined columns so their commas survive the CSV', () => {
    const csv = toCsv(csvColumnsFor(INVOICE_TYPE.purchase, ALLOW_ALL), [PURCHASE_INVOICE])

    expect(csv).toContain('"TOR, MTL"')
    expect(csv).toContain('"ARR-1, ARR-2"')
    expect(csv).toContain('"$1,200.00"')
  })

  it('exports the asset count as the total only, under a Total header', () => {
    expect(headersFor(INVOICE_TYPE.purchase, ALLOW_ALL)).not.toContain('Copiers / Total')
    expect(valueFor('Total')).toBe('7')
  })

  it('leaves a null money value empty rather than writing $0', () => {
    expect(valueFor('Purchase Cost')).toBe('$1,200.00')
    expect(valueFor('Sale Price')).toBe('')
  })

  it('drops the arrival and cleared columns for sales invoices', () => {
    const headers = headersFor(INVOICE_TYPE.sales, ALLOW_ALL)

    expect(headers).toContain('Customer')
    expect(headers).not.toContain('Vendor')
    expect(headers).not.toContain('Arrival IDs')
    expect(headers).not.toContain('Cleared')
  })

  it('omits every money column when the user cannot view prices', () => {
    const headers = headersFor(INVOICE_TYPE.purchase, DENY_PRICES)

    expect(headers).not.toContain('Purchase Cost')
    expect(headers).not.toContain('Transport Cost')
    expect(headers).not.toContain('Total Cost')
    expect(headers).not.toContain('Sale Price')
  })
})

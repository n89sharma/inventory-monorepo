import type { ColumnDef, HeaderContext } from '@tanstack/react-table'
import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { AssetSearchRow } from 'shared-types'
import { createAssetSearchColumns } from './asset-search-columns'
import { ASSET_SEARCH_REPORT_COLUMNS, assetSearchRowsToCsv } from './asset-search-report-columns'

const noHref = () => ''

function columnId(column: ColumnDef<AssetSearchRow>): string {
  if ('accessorKey' in column && typeof column.accessorKey === 'string') return column.accessorKey
  return column.id ?? ''
}

function headerLabel(column: ColumnDef<AssetSearchRow>): string {
  const header = column.header
  if (typeof header === 'string') return header
  if (typeof header === 'function') {
    const context = {
      column: { toggleSorting: () => {}, getIsSorted: () => false },
    } as unknown as HeaderContext<AssetSearchRow, unknown>
    const node = header(context)
    if (isValidElement(node)) return (node.props as { label?: string }).label ?? ''
  }
  return ''
}

function makeRow(overrides: Partial<AssetSearchRow> = {}): AssetSearchRow {
  return {
    id: 1,
    barcode: 'BC-1',
    brand: 'CANON',
    model: 'IR-2020',
    asset_type: 'COPIER',
    serial_number: 'SN-1',
    status: 'IN_STOCK',
    readiness: 'PP_OK',
    location: {
      warehouse_code: 'NYC',
      warehouse_street: '1 Main St',
      zone: 'RECEIVING',
      bin: 'A12',
    },
    is_in_transit: false,
    created_at: new Date(2026, 6, 15),
    country_of_origin: 'JAPAN',
    manufactured_year: 2020,
    weight: 1234,
    size: 5,
    specs_meter_total: 12000,
    specs_cassettes: 2,
    specs_internal_finisher: 'FIN-1',
    specs_toner_life_c: 80,
    specs_toner_life_m: 70,
    specs_toner_life_y: 60,
    specs_toner_life_k: 50,
    cost_purchase_cost: 1234,
    cost_transport_cost: 200,
    cost_processing_cost: 100,
    cost_total_cost: 1534,
    cost_sale_price: 3000,
    hold_hold_number: 'H-1',
    held_by: 'Alice',
    hold_created_for: 'Bob',
    hold_customer: 'ACME_CORP',
    hold_created_at: new Date(2026, 6, 1),
    vendor: 'BIG_VENDOR',
    customer: 'RETAIL_CO',
    departed_at: new Date(2026, 6, 10),
    arrival_created_at: new Date(2026, 6, 5),
    purchase_invoice_invoice_number: 'PI-100',
    latest_comment: 'Looks good',
    latest_comment_by: 'Carol',
    latest_comment_at: new Date(2026, 6, 12),
    ...overrides,
  }
}

function reportColumn(id: string): (typeof ASSET_SEARCH_REPORT_COLUMNS)[number] {
  const found = ASSET_SEARCH_REPORT_COLUMNS.find((c) => c.id === id)
  if (!found) throw new Error(`No report column: ${id}`)
  return found
}

describe('asset-search report columns', () => {
  it('mirrors the live search table columns in id and header order', () => {
    const liveColumns = createAssetSearchColumns(noHref)
    expect(liveColumns.map(columnId)).toEqual(ASSET_SEARCH_REPORT_COLUMNS.map((c) => c.id))
    expect(liveColumns.map(headerLabel)).toEqual(ASSET_SEARCH_REPORT_COLUMNS.map((c) => c.header))
  })

  it('carries the table display formatters', () => {
    expect(reportColumn('specs_meter_total').value(makeRow({ specs_meter_total: 12000 }))).toBe(
      '12 K',
    )
    expect(reportColumn('specs_meter_total').value(makeRow({ specs_meter_total: null }))).toBe('')
    expect(reportColumn('cost_purchase_cost').value(makeRow({ cost_purchase_cost: 1234 }))).toBe(
      '$1,234.00',
    )
    expect(reportColumn('cost_purchase_cost').value(makeRow({ cost_purchase_cost: null }))).toBe('')
    expect(
      reportColumn('location').value(
        makeRow({
          location: {
            warehouse_code: 'NYC',
            warehouse_street: '1 Main St',
            zone: 'BIN',
            bin: 'A12',
          },
        }),
      ),
    ).toBe('NYC | A12')
    expect(reportColumn('location').value(makeRow({ location: null }))).toBe('')
    expect(reportColumn('readiness').value(makeRow({ readiness: 'PP_OK' }))).toBe('PP OK')
    expect(reportColumn('created_at').value(makeRow({ created_at: new Date(2026, 6, 15) }))).toBe(
      'July 15, 2026',
    )
    expect(reportColumn('vendor').value(makeRow({ vendor: 'BIG_VENDOR' }))).toBe('Big Vendor')
  })

  it('emits only visible columns, keeping barcode and model always on', () => {
    const header = assetSearchRowsToCsv([makeRow()], new Set(['status'])).split('\r\n')[0]
    expect(header).toBe('Barcode,Model,Status')
  })
})

import type { ColumnDef, HeaderContext } from '@tanstack/react-table'
import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { AssetSummary } from 'shared-types'
import {
  createArrivalAssetSummaryColumns,
  createAssetSummaryColumns,
  createDepartureAssetSummaryColumns,
} from './collection-detail-columns'
import {
  REPORT_COLUMNS_BY_SECTION,
  collectionAssetsToCsv,
  type CollectionSection,
} from './collection-detail-report-columns'

const CREATED_AT_HEADER = 'Created'
const ACTION_COLUMN_IDS = new Set(['select', 'edit', 'delete'])

function headerLabel(column: ColumnDef<AssetSummary>): string {
  const header = column.header
  if (typeof header === 'string') return header
  if (typeof header === 'function') {
    const context = {
      column: { toggleSorting: () => {}, getIsSorted: () => false },
    } as unknown as HeaderContext<AssetSummary, unknown>
    const node = header(context)
    if (isValidElement(node)) return (node.props as { label?: string }).label ?? ''
  }
  return ''
}

// The report must mirror exactly the columns the user sees, so pull the labels
// straight off the live TanStack column defs: skip the select / edit / delete
// action columns and the hidden created_at, and resolve sortable (function)
// headers to their label.
function visibleTableHeaders(columns: ColumnDef<AssetSummary>[]): string[] {
  return columns
    .filter((column) => !ACTION_COLUMN_IDS.has(column.id ?? ''))
    .map(headerLabel)
    .filter((label) => label !== '' && label !== CREATED_AT_HEADER)
}

const noHref = () => ''

function makeAsset(overrides: Partial<AssetSummary> = {}): AssetSummary {
  return {
    id: 1,
    barcode: 'BC-1',
    brand: 'CANON',
    model: 'IR-2020',
    asset_type: 'COPIER',
    serial_number: 'SN-1',
    meter_total: 45000,
    cassettes: 2,
    internal_finisher: 'FIN-1',
    accessories: ['Toner', 'Drum'],
    weight: 10,
    size: 5,
    status: 'IN_STOCK',
    readiness: 'PP_OK',
    location: {
      warehouse_code: 'NYC',
      warehouse_street: '1 Main St',
      zone: 'RECEIVING',
      bin: 'A12',
    },
    purchase_invoice_number: 'PI-100',
    sales_invoice_number: 'SI-200',
    is_in_transit: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

describe('report column parity with the detail table', () => {
  it('common sections match the base table columns in order', () => {
    const headers = visibleTableHeaders(createAssetSummaryColumns(noHref))
    for (const section of [
      'transfers',
      'holds',
      'invoices',
    ] as const satisfies CollectionSection[]) {
      expect(REPORT_COLUMNS_BY_SECTION[section].map((c) => c.header)).toEqual(headers)
    }
  })

  it('arrivals match the arrival table columns in order', () => {
    const headers = visibleTableHeaders(createArrivalAssetSummaryColumns(noHref))
    expect(REPORT_COLUMNS_BY_SECTION.arrivals.map((c) => c.header)).toEqual(headers)
  })

  it('departures match the departure table columns in order', () => {
    const headers = visibleTableHeaders(createDepartureAssetSummaryColumns(noHref))
    expect(REPORT_COLUMNS_BY_SECTION.departures.map((c) => c.header)).toEqual(headers)
  })
})

describe('report column values carry the display formatters', () => {
  function valueFor(section: CollectionSection, header: string, asset: AssetSummary): string {
    const column = REPORT_COLUMNS_BY_SECTION[section].find((c) => c.header === header)
    if (!column) throw new Error(`Missing column ${header}`)
    return column.value(asset)
  }

  it('formats total meter into thousands', () => {
    expect(valueFor('holds', 'Total Meter', makeAsset({ meter_total: 45000 }))).toBe('45 K')
    expect(valueFor('holds', 'Total Meter', makeAsset({ meter_total: null }))).toBe('')
  })

  it('formats location as the single displayed string', () => {
    expect(valueFor('holds', 'Location', makeAsset())).toBe('NYC | Receiving')
    const binAsset = makeAsset({
      location: { warehouse_code: 'NYC', warehouse_street: '1 Main St', zone: 'BIN', bin: 'A12' },
    })
    expect(valueFor('holds', 'Location', binAsset)).toBe('NYC | A12')
    expect(valueFor('holds', 'Location', makeAsset({ location: null }))).toBe('')
  })

  it('emits the readiness label and title-cased status', () => {
    expect(valueFor('holds', 'Readiness', makeAsset({ readiness: 'PP_OK' }))).toBe('PP OK')
    expect(valueFor('holds', 'Status', makeAsset({ status: 'IN_STOCK' }))).toBe('In Stock')
  })

  it('uses the purchase invoice for arrivals and sales invoice for departures', () => {
    const asset = makeAsset({ purchase_invoice_number: 'PI-100', sales_invoice_number: 'SI-200' })
    expect(valueFor('arrivals', 'Invoice', asset)).toBe('PI-100')
    expect(valueFor('departures', 'Invoice', asset)).toBe('SI-200')
    expect(REPORT_COLUMNS_BY_SECTION.arrivals[4].header).toBe('Invoice')
    expect(REPORT_COLUMNS_BY_SECTION.departures[4].header).toBe('Invoice')
  })
})

describe('collectionAssetsToCsv', () => {
  it('writes a header row and one row per asset', () => {
    const csv = collectionAssetsToCsv('holds', [makeAsset()])
    const lines = csv.trim().split('\n')
    expect(lines[0].trim()).toBe(
      'Barcode,Brand,Model,Serial Number,Status,Readiness,Total Meter,Cassettes,Internal Finisher,Accessories,Location',
    )
    expect(lines[1]).toContain('BC-1')
    expect(lines[1]).toContain('45 K')
    expect(lines[1]).toContain('"Toner, Drum"')
  })
})

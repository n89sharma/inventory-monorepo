import type { ColumnDef, HeaderContext } from '@tanstack/react-table'
import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { AssetCost, AssetSummary } from 'shared-types'
import {
  createArrivalDetailColumns,
  createCollectionDetailColumns,
  createDepartureDetailColumns,
  createInvoiceDetailColumns,
  createTransferDetailColumns,
  type PricePermissions,
} from './collection-detail-columns'
import {
  COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION,
  collectionDetailToCsv,
  type CollectionSection,
} from './collection-detail-report-columns'

const ALL_PRICES: PricePermissions = { canViewPurchasePrice: true, canViewSalePrice: true }
const NO_PRICES: PricePermissions = { canViewPurchasePrice: false, canViewSalePrice: false }

const EMPTY_COST: AssetCost = {
  purchase_cost: null,
  transport_cost: null,
  processing_cost: null,
  other_cost: null,
  parts_cost: null,
  total_cost: null,
  sale_price: null,
}

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
      warehouse_id: 1,
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

const TABLE_COLUMNS_BY_SECTION = {
  arrivals: () => createArrivalDetailColumns({ getHref: noHref }),
  transfers: (prices) => createTransferDetailColumns({ getHref: noHref, ...prices }),
  departures: (prices) => createDepartureDetailColumns({ getHref: noHref, ...prices }),
  invoices: (prices) => createInvoiceDetailColumns({ getHref: noHref, ...prices }),
  holds: () => createCollectionDetailColumns({ getHref: noHref }),
} as const satisfies Record<
  CollectionSection,
  (prices: PricePermissions) => ColumnDef<AssetSummary>[]
>

const SECTIONS = Object.keys(TABLE_COLUMNS_BY_SECTION) as CollectionSection[]

const PRICE_PERMISSION_CASES: PricePermissions[] = [
  { canViewPurchasePrice: false, canViewSalePrice: false },
  { canViewPurchasePrice: true, canViewSalePrice: false },
  { canViewPurchasePrice: false, canViewSalePrice: true },
  { canViewPurchasePrice: true, canViewSalePrice: true },
]

const PURCHASE_COST_HEADERS = ['Purchase Cost', 'Transport Cost', 'Processing Cost', 'Total Cost']
const SALE_PRICE_HEADER = 'Sale Price'
const PRICED_SECTIONS = ['transfers', 'departures', 'invoices'] as const
const UNPRICED_SECTIONS = ['arrivals', 'holds'] as const

function reportHeaders(section: CollectionSection, prices: PricePermissions): string[] {
  return COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION[section](prices).map((c) => c.header)
}

describe('report column parity with the detail table', () => {
  for (const section of SECTIONS) {
    for (const prices of PRICE_PERMISSION_CASES) {
      const permissionLabel = `purchase=${prices.canViewPurchasePrice} sale=${prices.canViewSalePrice}`
      it(`${section} match the table columns in order (${permissionLabel})`, () => {
        expect(reportHeaders(section, prices)).toEqual(
          visibleTableHeaders(TABLE_COLUMNS_BY_SECTION[section](prices)),
        )
      })
    }
  }

  // Parity alone would also pass if both sides simply dropped the prices, so pin the
  // permission-driven presence separately.
  it.each(PRICED_SECTIONS)('%s carry the price columns when permitted', (section) => {
    const headers = reportHeaders(section, {
      canViewPurchasePrice: true,
      canViewSalePrice: true,
    })
    expect(headers.slice(-5)).toEqual([...PURCHASE_COST_HEADERS, SALE_PRICE_HEADER])
  })

  it.each(PRICED_SECTIONS)('%s show only the sale price with only that permission', (section) => {
    const headers = reportHeaders(section, {
      canViewPurchasePrice: false,
      canViewSalePrice: true,
    })
    expect(headers).toContain(SALE_PRICE_HEADER)
    expect(headers).not.toContain('Purchase Cost')
    expect(headers).not.toContain('Total Cost')
  })

  it.each(PRICED_SECTIONS)('%s drop every price column without permission', (section) => {
    const headers = reportHeaders(section, {
      canViewPurchasePrice: false,
      canViewSalePrice: false,
    })
    for (const header of [...PURCHASE_COST_HEADERS, SALE_PRICE_HEADER]) {
      expect(headers).not.toContain(header)
    }
  })

  it.each(UNPRICED_SECTIONS)('%s never carry price columns', (section) => {
    const headers = reportHeaders(section, {
      canViewPurchasePrice: true,
      canViewSalePrice: true,
    })
    for (const header of [...PURCHASE_COST_HEADERS, SALE_PRICE_HEADER]) {
      expect(headers).not.toContain(header)
    }
  })
})

describe('report column values carry the display formatters', () => {
  function valueFor(section: CollectionSection, header: string, asset: AssetSummary): string {
    const column = COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION[section](ALL_PRICES).find(
      (c) => c.header === header,
    )
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
      location: {
        warehouse_id: 1,
        warehouse_code: 'NYC',
        warehouse_street: '1 Main St',
        zone: 'BIN',
        bin: 'A12',
      },
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
    expect(COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION.arrivals(ALL_PRICES)[3].header).toBe(
      'Invoice',
    )
    expect(COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION.departures(ALL_PRICES)[3].header).toBe(
      'Invoice',
    )
  })
})

describe('collectionDetailToCsv', () => {
  it('writes a header row and one row per asset', () => {
    const csv = collectionDetailToCsv('holds', [makeAsset()], ALL_PRICES)
    const lines = csv.trim().split('\n')
    expect(lines[0].trim()).toBe(
      'Barcode,Serial Number,Model,Brand,Status,Readiness,Total Meter,Cassettes,Internal Finisher,Accessories,Location',
    )
    expect(lines[1]).toContain('BC-1')
    expect(lines[1]).toContain('45 K')
    expect(lines[1]).toContain('"Toner, Drum"')
  })

  it('appends the price columns for invoices when permitted', () => {
    const csv = collectionDetailToCsv('invoices', [makeAsset()], ALL_PRICES)
    expect(csv.trim().split('\n')[0].trim()).toBe(
      'Barcode,Serial Number,Model,Brand,Status,Readiness,Total Meter,Cassettes,Internal Finisher,Accessories,Location,Purchase Cost,Transport Cost,Processing Cost,Total Cost,Sale Price',
    )
  })

  it('appends the price columns for transfers when permitted', () => {
    const csv = collectionDetailToCsv('transfers', [makeAsset()], ALL_PRICES)
    expect(csv.trim().split('\n')[0].trim()).toBe(
      'Barcode,Serial Number,Model,Brand,Status,Readiness,Total Meter,Cassettes,Internal Finisher,Accessories,Location,Purchase Cost,Transport Cost,Processing Cost,Total Cost,Sale Price',
    )
  })

  it('keeps the departure invoice column ahead of the price columns', () => {
    const csv = collectionDetailToCsv('departures', [makeAsset()], ALL_PRICES)
    expect(csv.trim().split('\n')[0].trim()).toBe(
      'Barcode,Serial Number,Model,Invoice,Brand,Status,Readiness,Total Meter,Cassettes,Internal Finisher,Accessories,Location,Purchase Cost,Transport Cost,Processing Cost,Total Cost,Sale Price',
    )
  })

  it('omits the price columns without the viewing permissions', () => {
    for (const section of PRICED_SECTIONS) {
      const header = collectionDetailToCsv(section, [makeAsset()], NO_PRICES).trim().split('\n')[0]
      expect(header).not.toContain('Purchase Cost')
      expect(header).not.toContain('Sale Price')
    }
  })

  it('writes the formatted amounts, not raw numbers', () => {
    const csv = collectionDetailToCsv(
      'departures',
      [makeAsset({ cost: { ...EMPTY_COST, purchase_cost: 1234.5, sale_price: 2000 } })],
      ALL_PRICES,
    )
    const row = csv.trim().split('\n')[1]
    expect(row).toContain('$1,234.50')
    expect(row).toContain('$2,000.00')
  })
})

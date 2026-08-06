import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type HeaderContext,
} from '@tanstack/react-table'
import { isValidElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetSearchRow, Permission } from 'shared-types'
import { ASSET_SEARCH_COLUMNS, canViewColumn, COLUMN_SECTIONS } from './asset-search-columns'
import { createSearchPageColumns } from './search-page-columns'
import { searchPageRowsToCsv } from './search-page-report-columns'

const CSV_ROW_DELIMITER = '\r\n'
const ALWAYS_VISIBLE_COLUMN_IDS = ['barcode', 'model']
const MARGIN_COLUMN_IDS = ['gross_margin', 'margin_percent']

const allows =
  (granted: readonly Permission[]) =>
  (permission: Permission): boolean =>
    granted.includes(permission)
const allowsEverything = (): boolean => true
const COST_PERMISSIONS = ['view_purchase_price', 'view_sale_price'] as const satisfies Permission[]
// Frozen so the stock_days and days_held columns, which count from today, are deterministic.
const NOW = new Date(2026, 6, 27)

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

function liveColumnIds(): string[] {
  return createSearchPageColumns(noHref, allowsEverything).map(columnId)
}

function csvFor(row: AssetSearchRow, ids: string[]): { header: string; data: string } {
  const [header, data] = searchPageRowsToCsv([row], new Set(ids)).split(CSV_ROW_DELIMITER)
  return { header, data }
}

// Sorts through the real TanStack pipeline rather than the accessors directly, so the
// column defs' accessorKey/accessorFn split and sortUndefined are exercised as shipped.
function sortedBarcodes(rows: AssetSearchRow[], columnId: string, desc = false): string[] {
  const table = createTable<AssetSearchRow>({
    data: rows,
    columns: createSearchPageColumns(noHref, allowsEverything),
    state: { sorting: [{ id: columnId, desc }] },
    onStateChange: () => {},
    renderFallbackValue: null,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  return table.getSortedRowModel().rows.map((row) => row.original.barcode)
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
      warehouse_id: 1,
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
    accessories: ['Toner', 'Drum'],
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
    sales_invoice_invoice_number: 'SI-200',
    sales_invoice_invoice_reference: 'CUST-REF-9',
    latest_comment: 'Looks good',
    latest_comment_by: 'Carol',
    latest_comment_at: new Date(2026, 6, 12),
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('asset-search report columns', () => {
  it('exports one CSV column per live table column, in table order', () => {
    const liveColumns = createSearchPageColumns(noHref, allowsEverything)
    const { header } = csvFor(makeRow(), liveColumns.map(columnId))
    expect(header.split(',')).toEqual(liveColumns.map(headerLabel))
  })

  it('exports the always-visible columns even when the viewer chose none', () => {
    const { header } = csvFor(makeRow(), [])
    expect(header.split(',')).toEqual(['Barcode', 'Model'])
  })

  it('writes the full header row', () => {
    const { header } = csvFor(makeRow(), liveColumnIds())
    expect(header).toBe(
      'Barcode,Brand,Model,Asset Type,Serial Number,Status,Readiness,Location,' +
        'Country of Origin,Total Meter,Weight,Size,Days Held,Cassettes,Internal Finisher,' +
        'Accessories,Toner Life C,Toner Life M,Toner Life Y,Toner Life K,' +
        'Vendor,Arrived At,Customer,Departed At,' +
        'Purchase Cost,Transport Cost,Processing Cost,Total Cost,Sale Price,Gross Margin,' +
        'Margin %,Hold #,Held By,Held For,Hold Customer,Hold Created,' +
        'Created,Stock Days,Purchase Invoice,Sales Invoice,Last Comment',
    )
  })

  it('runs every column value through its display formatter', () => {
    const { data } = csvFor(makeRow(), liveColumnIds())
    expect(data).toBe(
      'BC-1,Canon,IR-2020,Copier,SN-1,In Stock,PP OK,NYC | Receiving,' +
        'Japan,12 K,"1,234 lbs",5,26,2,FIN-1,' +
        '"Toner, Drum",80,70,60,50,' +
        'Big Vendor,"July 05, 2026",Retail Co,"July 10, 2026",' +
        '"$1,234.00",$200.00,$100.00,"$1,534.00","$3,000.00","$1,466.00",' +
        '48.9%,H-1,Alice,Bob,Acme Corp,"July 01, 2026",' +
        '"July 15, 2026",12,PI-100,CUST-REF-9,Looks good',
    )
  })

  it('emits an empty field for every nullable column left null', () => {
    const nulled = makeRow({
      location: null,
      country_of_origin: null,
      specs_meter_total: null,
      specs_cassettes: null,
      specs_internal_finisher: null,
      accessories: [],
      specs_toner_life_c: null,
      specs_toner_life_m: null,
      specs_toner_life_y: null,
      specs_toner_life_k: null,
      cost_purchase_cost: null,
      cost_transport_cost: null,
      cost_processing_cost: null,
      cost_total_cost: null,
      cost_sale_price: null,
      hold_hold_number: null,
      held_by: null,
      hold_created_for: null,
      hold_customer: null,
      hold_created_at: null,
      vendor: null,
      customer: null,
      departed_at: null,
      arrival_created_at: null,
      purchase_invoice_invoice_number: null,
      sales_invoice_invoice_number: null,
      sales_invoice_invoice_reference: null,
      latest_comment: null,
    })
    const { data } = csvFor(nulled, liveColumnIds())
    expect(data).toBe(
      'BC-1,Canon,IR-2020,Copier,SN-1,In Stock,PP OK,,' +
        ',,"1,234 lbs",5,,,,' +
        ',,,,,' +
        ',,,,' +
        ',,,,,,,' +
        ',,,,,' +
        '"July 15, 2026",12,,,',
    )
  })

  it('reads the bin when the location zone is BIN', () => {
    const binRow = makeRow({
      location: {
        warehouse_id: 1,
        warehouse_code: 'NYC',
        warehouse_street: '1 Main St',
        zone: 'BIN',
        bin: 'A12',
      },
    })
    expect(csvFor(binRow, ['location']).data).toBe('BC-1,IR-2020,NYC | A12')
  })

  it('reports an in-transit asset regardless of its stored location', () => {
    expect(csvFor(makeRow({ is_in_transit: true }), ['location']).data).toBe(
      'BC-1,IR-2020,In transit',
    )
  })

  it('emits only visible columns, keeping barcode and model always on', () => {
    const { header } = csvFor(makeRow(), ['status'])
    expect(header).toBe('Barcode,Model,Status')
  })

  // The CSV preserves whatever order it is handed. It does not sort, so the row order
  // of an export is decided entirely by the caller — see useAssetSelection.
  it('writes rows in the order it is given', () => {
    const older = makeRow({ barcode: 'OLD', created_at: new Date(2026, 2, 5) })
    const newer = makeRow({ barcode: 'NEW', created_at: new Date(2026, 6, 15) })
    const barcodesOf = (rows: AssetSearchRow[]) =>
      searchPageRowsToCsv(rows, new Set(['status']))
        .split(CSV_ROW_DELIMITER)
        .slice(1)
        .map((line) => line.split(',')[0])

    expect(barcodesOf([older, newer])).toEqual(['OLD', 'NEW'])
    expect(barcodesOf([newer, older])).toEqual(['NEW', 'OLD'])
  })
})

describe('asset search column sorting', () => {
  it('orders numeric columns by magnitude, not as text', () => {
    // 2, 10 and 9 days of stock: sorted as text 10 would lead.
    const rows = [
      makeRow({ barcode: 'TWO', created_at: new Date(2026, 6, 25) }),
      makeRow({ barcode: 'TEN', created_at: new Date(2026, 6, 17) }),
      makeRow({ barcode: 'NINE', created_at: new Date(2026, 6, 18) }),
    ]
    expect(sortedBarcodes(rows, 'stock_days')).toEqual(['TWO', 'NINE', 'TEN'])
    expect(sortedBarcodes(rows, 'stock_days', true)).toEqual(['TEN', 'NINE', 'TWO'])
  })

  it('orders costs by magnitude, not by their formatted string', () => {
    // "$9.00" sorts after "$10.00" and "$200.00" as text.
    const rows = [
      makeRow({ barcode: 'TWO_HUNDRED', cost_purchase_cost: 200 }),
      makeRow({ barcode: 'NINE', cost_purchase_cost: 9 }),
      makeRow({ barcode: 'TEN', cost_purchase_cost: 10 }),
    ]
    expect(sortedBarcodes(rows, 'cost_purchase_cost')).toEqual(['NINE', 'TEN', 'TWO_HUNDRED'])
  })

  it('orders the meter by its raw reading, not by the thousands-formatted text', () => {
    // Displayed as "900", "1 K" and "12 K", which sort in a different order as text.
    const rows = [
      makeRow({ barcode: 'TWELVE_K', specs_meter_total: 12000 }),
      makeRow({ barcode: 'NINE_HUNDRED', specs_meter_total: 900 }),
      makeRow({ barcode: 'ONE_K', specs_meter_total: 1200 }),
    ]
    expect(sortedBarcodes(rows, 'specs_meter_total')).toEqual(['NINE_HUNDRED', 'ONE_K', 'TWELVE_K'])
  })

  it('orders weight by magnitude, not by its formatted string', () => {
    // "1,000 lbs" sorts between "100 lbs" and "90 lbs" as text.
    const rows = [
      makeRow({ barcode: 'THOUSAND', weight: 1000 }),
      makeRow({ barcode: 'NINETY', weight: 90 }),
      makeRow({ barcode: 'HUNDRED', weight: 100 }),
    ]
    expect(sortedBarcodes(rows, 'weight')).toEqual(['NINETY', 'HUNDRED', 'THOUSAND'])
  })

  it('orders date columns chronologically, not by their formatted month name', () => {
    // Formatted as "March 05, 2026", "April 10, 2026", "July 15, 2026": as text April leads.
    const rows = [
      makeRow({ barcode: 'JULY', created_at: new Date(2026, 6, 15) }),
      makeRow({ barcode: 'MARCH', created_at: new Date(2026, 2, 5) }),
      makeRow({ barcode: 'APRIL', created_at: new Date(2026, 3, 10) }),
    ]
    expect(sortedBarcodes(rows, 'created_at')).toEqual(['MARCH', 'APRIL', 'JULY'])
    expect(sortedBarcodes(rows, 'created_at', true)).toEqual(['JULY', 'APRIL', 'MARCH'])
  })

  it('orders every other date column chronologically too', () => {
    const dateColumns = ['departed_at', 'arrival_created_at', 'hold_created_at'] as const
    for (const columnId of dateColumns) {
      const rows = [
        makeRow({ barcode: 'JULY', [columnId]: new Date(2026, 6, 15) }),
        makeRow({ barcode: 'MARCH', [columnId]: new Date(2026, 2, 5) }),
        makeRow({ barcode: 'APRIL', [columnId]: new Date(2026, 3, 10) }),
      ]
      expect(sortedBarcodes(rows, columnId)).toEqual(['MARCH', 'APRIL', 'JULY'])
    }
  })

  it('keeps assets with no hold last in both directions of days held', () => {
    const rows = [
      makeRow({ barcode: 'UNHELD', hold_created_at: null }),
      makeRow({ barcode: 'THIRTY', hold_created_at: new Date(2026, 5, 27) }),
      makeRow({ barcode: 'FIVE', hold_created_at: new Date(2026, 6, 22) }),
    ]
    expect(sortedBarcodes(rows, 'days_held')).toEqual(['FIVE', 'THIRTY', 'UNHELD'])
    expect(sortedBarcodes(rows, 'days_held', true)).toEqual(['THIRTY', 'FIVE', 'UNHELD'])
  })

  it('orders location by the string the cell displays', () => {
    const at = (warehouse_code: string, zone: string) => ({
      warehouse_id: 1,
      warehouse_code,
      warehouse_street: '1 Main St',
      zone,
      bin: 'A12',
    })
    const rows = [
      makeRow({ barcode: 'NYC', location: at('NYC', 'RECEIVING') }),
      makeRow({ barcode: 'ATL', location: at('ATL', 'RECEIVING') }),
      makeRow({ barcode: 'TRANSIT', location: at('ATL', 'RECEIVING'), is_in_transit: true }),
    ]
    expect(sortedBarcodes(rows, 'location')).toEqual(['ATL', 'TRANSIT', 'NYC'])
  })

  it('orders text columns alphabetically', () => {
    const rows = [
      makeRow({ barcode: 'CHARLIE', held_by: 'Charlie' }),
      makeRow({ barcode: 'ALICE', held_by: 'Alice' }),
      makeRow({ barcode: 'BOB', held_by: 'Bob' }),
    ]
    expect(sortedBarcodes(rows, 'held_by')).toEqual(['ALICE', 'BOB', 'CHARLIE'])
  })
})

describe('margin columns', () => {
  const marginCsv = (overrides: Partial<AssetSearchRow>) =>
    csvFor(makeRow(overrides), MARGIN_COLUMN_IDS).data

  it('reports the margin and its percentage of the sale price', () => {
    expect(marginCsv({ cost_sale_price: 1400, cost_total_cost: 1000 })).toBe(
      'BC-1,IR-2020,$400.00,28.6%',
    )
  })

  it('keeps the minus outside the dollar sign when an asset sold below cost', () => {
    expect(marginCsv({ cost_sale_price: 800, cost_total_cost: 1000 })).toBe(
      'BC-1,IR-2020,-$200.00,-25.0%',
    )
  })

  it('writes off the whole cost when an asset left at a zero sale price', () => {
    expect(marginCsv({ cost_sale_price: 0, cost_total_cost: 500 })).toBe(
      'BC-1,IR-2020,-$500.00,-100.0%',
    )
  })

  it('reports flat rather than a total loss when both the sale price and cost are zero', () => {
    expect(marginCsv({ cost_sale_price: 0, cost_total_cost: 0 })).toBe('BC-1,IR-2020,$0.00,0.0%')
  })

  it('leaves both columns empty when either input is missing', () => {
    expect(marginCsv({ cost_sale_price: null, cost_total_cost: 500 })).toBe('BC-1,IR-2020,,')
    expect(marginCsv({ cost_sale_price: 1400, cost_total_cost: null })).toBe('BC-1,IR-2020,,')
  })

  it('orders by the computed number, not its formatted text, keeping unpriced assets last', () => {
    // Formatted as "$90.00", "$100.00" and "" — a different order as text.
    const rows = [
      makeRow({ barcode: 'HUNDRED', cost_sale_price: 1100, cost_total_cost: 1000 }),
      makeRow({ barcode: 'UNPRICED', cost_sale_price: null, cost_total_cost: 1000 }),
      makeRow({ barcode: 'NINETY', cost_sale_price: 1090, cost_total_cost: 1000 }),
    ]
    expect(sortedBarcodes(rows, 'gross_margin')).toEqual(['NINETY', 'HUNDRED', 'UNPRICED'])
    expect(sortedBarcodes(rows, 'gross_margin', true)).toEqual(['HUNDRED', 'NINETY', 'UNPRICED'])
  })

  it('hides both columns unless the viewer may see sale price and purchase cost', () => {
    const marginColumns = ASSET_SEARCH_COLUMNS.filter((c) => MARGIN_COLUMN_IDS.includes(c.id))
    expect(marginColumns).toHaveLength(MARGIN_COLUMN_IDS.length)

    for (const column of marginColumns) {
      expect(canViewColumn(column, allows([]))).toBe(false)
      expect(canViewColumn(column, allows(['view_sale_price']))).toBe(false)
      expect(canViewColumn(column, allows(['view_purchase_price']))).toBe(false)
      expect(canViewColumn(column, allows(['view_sale_price', 'view_purchase_price']))).toBe(true)
    }
  })
})

describe('asset search columns', () => {
  it('renders the table in the order the columns are declared', () => {
    expect(liveColumnIds()).toEqual(ASSET_SEARCH_COLUMNS.map((c) => c.id))
  })

  it('leaves the columns the viewer may not see out of the table entirely', () => {
    const gatedIds = ASSET_SEARCH_COLUMNS.filter((c) => c.permissions).map((c) => c.id)
    expect(gatedIds.length).toBeGreaterThan(0)

    expect(createSearchPageColumns(noHref, allows([])).map(columnId)).toEqual(
      ASSET_SEARCH_COLUMNS.filter((c) => !c.permissions).map((c) => c.id),
    )
    expect(createSearchPageColumns(noHref, allows(COST_PERMISSIONS)).map(columnId)).toEqual(
      ASSET_SEARCH_COLUMNS.map((c) => c.id),
    )
  })

  it('marks exactly barcode and model always visible', () => {
    const alwaysVisible = ASSET_SEARCH_COLUMNS.filter((c) => c.alwaysVisible).map((c) => c.id)
    expect(alwaysVisible).toEqual(ALWAYS_VISIBLE_COLUMN_IDS)
  })

  it('groups the pickable columns by section, in picker order', () => {
    const grouped = COLUMN_SECTIONS.map((section) => ({
      section: section.id,
      ids: ASSET_SEARCH_COLUMNS.filter((c) => !c.alwaysVisible && c.section === section.id).map(
        (c) => c.id,
      ),
    }))
    expect(grouped).toEqual([
      {
        section: 'general',
        ids: [
          'brand',
          'asset_type',
          'serial_number',
          'status',
          'readiness',
          'location',
          'created_at',
          'stock_days',
        ],
      },
      {
        section: 'specs',
        ids: [
          'country_of_origin',
          'specs_meter_total',
          'weight',
          'size',
          'specs_cassettes',
          'specs_internal_finisher',
          'accessories',
          'specs_toner_life_c',
          'specs_toner_life_m',
          'specs_toner_life_y',
          'specs_toner_life_k',
        ],
      },
      { section: 'arrival', ids: ['vendor', 'arrival_created_at'] },
      { section: 'departure', ids: ['customer', 'departed_at'] },
      {
        section: 'cost',
        ids: [
          'cost_purchase_cost',
          'cost_transport_cost',
          'cost_processing_cost',
          'cost_total_cost',
          'cost_sale_price',
          'gross_margin',
          'margin_percent',
        ],
      },
      {
        section: 'hold',
        ids: [
          'days_held',
          'hold_hold_number',
          'held_by',
          'hold_created_for',
          'hold_customer',
          'hold_created_at',
        ],
      },
      {
        section: 'invoice',
        ids: ['purchase_invoice_invoice_reference', 'sales_invoice_invoice_reference'],
      },
      { section: 'last_comment', ids: ['latest_comment'] },
    ])
  })
})

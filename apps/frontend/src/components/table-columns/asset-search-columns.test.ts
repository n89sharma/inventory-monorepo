import {
  createTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
} from '@tanstack/react-table'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetSearchRow, Permission } from 'shared-types'
import {
  ASSET_COLUMN_ORDER,
  ASSET_SEARCH_COLUMNS,
  canViewColumn,
  COLUMN_SECTIONS,
  ASSETS_BY_SERIAL_NUMBER_DEFAULT_COLUMN_IDS,
  DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST,
  IDENTITY_COLUMN_IDS,
} from './asset-search-columns'
import { DEFAULT_VISIBLE_COLUMN_IDS_BY_SECTION } from './collection-detail-columns'
import { PINNED_ASSET_COLUMN_IDS } from './column-primitives'
import { createSearchPageColumns } from './search-page-columns'
import { searchPageRowsToCsv } from './search-page-report-columns'

const CSV_ROW_DELIMITER = '\r\n'
const ID_SECTION_COLUMN_IDS = ['barcode', 'serial_number']
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
  return typeof column.header === 'string' ? column.header : ''
}

function csvHeaderLabel(column: ColumnDef<AssetSearchRow>): string {
  const definition = ASSET_SEARCH_COLUMNS.find((c) => c.id === columnId(column))
  return definition?.csvHeader ?? headerLabel(column)
}

function liveColumnIds(): string[] {
  return createSearchPageColumns(noHref, allowsEverything).map(columnId)
}

// The identity columns are pickable now, so a caller that wants them in the export has to
// ask for them. Every case below reads an asset by its barcode, so they all do. The export
// follows the order it is handed, so the ids are resolved to ASSET_COLUMN_ORDER first.
function csvFor(row: AssetSearchRow, ids: string[]): { header: string; data: string } {
  const wanted = new Set<string>([...IDENTITY_COLUMN_IDS, ...ids])
  const orderedIds = ASSET_COLUMN_ORDER.filter((id) => wanted.has(id))
  const [header, data] = searchPageRowsToCsv([row], orderedIds).split(CSV_ROW_DELIMITER)
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
    errors: ['E001', 'E045'],
    specs_toner_life_c: 80,
    specs_toner_life_m: 70,
    specs_toner_life_y: 60,
    specs_toner_life_k: 50,
    cost_purchase_cost: 1234,
    cost_transport_cost: 200,
    cost_transfer_cost: 50,
    cost_processing_cost: 100,
    cost_other_cost: 0,
    cost_parts_cost: 0,
    cost_total_cost: 1534,
    cost_sale_price: 3000,
    hold_hold_number: 'H-1',
    held_by: 'Alice',
    hold_created_for: 'Bob',
    hold_customer: 'ACME_CORP',
    hold_created_at: new Date(2026, 6, 1),
    vendor: 'BIG_VENDOR',
    customer: 'RETAIL_CO',
    salesperson: 'JANE_SMITH',
    departure_number: 'D-260710-001',
    arrival_number: 'A-260705-001',
    arrival_warehouse_code: 'TOR',
    departed_at: '2026-07-10',
    arrival_created_at: new Date(2026, 6, 5),
    purchase_invoice_invoice_number: 'PI-100',
    purchase_invoice_invoice_reference: 'VENDOR-REF-4',
    sales_invoice_invoice_number: 'SI-200',
    sales_invoice_invoice_reference: 'CUST-REF-9',
    latest_comment: 'Looks good',
    latest_comment_by: 'Carol',
    latest_comment_at: new Date(2026, 6, 12),
    is_damaged: null,
    damage_notes: null,
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
  it('exports one CSV column per live table column, in canonical order', () => {
    const liveColumns = createSearchPageColumns(noHref, allowsEverything)
    const byId = new Map(liveColumns.map((column) => [columnId(column), column]))
    const { header } = csvFor(makeRow(), liveColumns.map(columnId))

    expect(header.split(',')).toEqual(ASSET_COLUMN_ORDER.map((id) => csvHeaderLabel(byId.get(id)!)))
  })

  it('exports nothing at all when the viewer has turned every column off', () => {
    const emptyExport = searchPageRowsToCsv([makeRow()], [])
    expect(emptyExport.split(CSV_ROW_DELIMITER)).toEqual(['', ''])
  })

  it('writes the full header row', () => {
    const { header } = csvFor(makeRow(), liveColumnIds())
    expect(header).toBe(
      'Barcode,Serial Number,Model,Total Meter (K),Cassettes,Internal Finisher,Accessories,' +
        'Brand,Asset Type,Country of Origin,Manufactured Year,Weight (lbs),Size,' +
        'Toner Life C,Toner Life M,Toner Life Y,Toner Life K,' +
        'Purchase Cost,Transport Cost,Transfer Cost,Processing Cost,Other Cost,Parts Cost,' +
        'Total Cost,Sale Price,' +
        'Status,Readiness,Damaged,Damage Notes,' +
        'Vendor,Arrival #,Arrival Warehouse,Arrived At,' +
        'Days Held,Hold #,Held By,Held For,Hold Customer,Hold Created,' +
        'Customer,Salesperson,Departure #,Departed At,' +
        'Purchase Invoice,Sales Invoice,Gross Margin,Margin %,' +
        'Location,Created,Stock Days,Errors,Last Comment',
    )
  })

  it("writes each column's CSV text", () => {
    const { data } = csvFor(makeRow(), liveColumnIds())
    expect(data).toBe(
      'BC-1,SN-1,IR-2020,12,2,FIN-1,"Toner, Drum",' +
        'CANON,Copier,Japan,2020,1234,5,' +
        '80,70,60,50,' +
        '"$1,234.00",$200.00,$50.00,$100.00,$0.00,$0.00,"$1,534.00","$3,000.00",' +
        'In Stock,PP OK,,,' +
        'BIG_VENDOR,A-260705-001,TOR,"Jul 5, 2026",' +
        '26,H-1,Alice,Bob,ACME_CORP,"Jul 1, 2026",' +
        'RETAIL_CO,Jane Smith,D-260710-001,"Jul 10, 2026",' +
        'VENDOR-REF-4,CUST-REF-9,' +
        '"$1,466.00",48.9%,' +
        'NYC | Receiving,"Jul 15, 2026",12,"E001, E045",Looks good',
    )
  })

  it('exports the meter in thousands, with the unit moved to the CSV header', () => {
    const meterColumn = ASSET_SEARCH_COLUMNS.find((c) => c.id === 'specs_meter_total')
    const meterText = (meter: number | null) =>
      meterColumn?.text(makeRow({ specs_meter_total: meter }))
    expect(meterColumn?.label).toBe('Total Meter')
    expect(meterColumn?.csvHeader).toBe('Total Meter (K)')
    expect(meterColumn?.cell?.(makeRow({ specs_meter_total: 12000 }), { detailHref: noHref })).toBe(
      '12 K',
    )
    expect(meterText(12000)).toBe('12')
    expect(meterText(12500)).toBe('12.5')
    expect(meterText(1234)).toBe('1.2')
    expect(meterText(900)).toBe('0.9')
    expect(meterText(0)).toBe('0')
    expect(meterText(null)).toBe('')
  })

  it('exports the weight as a plain number, with the unit moved to the CSV header', () => {
    const weightColumn = ASSET_SEARCH_COLUMNS.find((c) => c.id === 'weight')
    const weightText = (weight: number) => weightColumn?.text(makeRow({ weight }))
    expect(weightColumn?.label).toBe('Weight')
    expect(weightColumn?.csvHeader).toBe('Weight (lbs)')
    expect(weightColumn?.cell?.(makeRow({ weight: 1234.6 }), { detailHref: noHref })).toBe(
      '1,235 lbs',
    )
    expect(weightText(1234.6)).toBe('1234.6')
    expect(weightText(1234)).toBe('1234')
    expect(weightText(0)).toBe('0')
  })

  it('emits an empty field for every nullable column left null', () => {
    const nulled = makeRow({
      location: null,
      country_of_origin: null,
      manufactured_year: null,
      specs_meter_total: null,
      specs_cassettes: null,
      specs_internal_finisher: null,
      accessories: [],
      errors: [],
      specs_toner_life_c: null,
      specs_toner_life_m: null,
      specs_toner_life_y: null,
      specs_toner_life_k: null,
      cost_purchase_cost: null,
      cost_transport_cost: null,
      cost_transfer_cost: null,
      cost_processing_cost: null,
      cost_other_cost: null,
      cost_parts_cost: null,
      cost_total_cost: null,
      cost_sale_price: null,
      hold_hold_number: null,
      held_by: null,
      hold_created_for: null,
      hold_customer: null,
      hold_created_at: null,
      vendor: null,
      customer: null,
      salesperson: null,
      departure_number: null,
      departed_at: null,
      arrival_number: null,
      arrival_warehouse_code: null,
      arrival_created_at: null,
      purchase_invoice_invoice_number: null,
      purchase_invoice_invoice_reference: null,
      sales_invoice_invoice_number: null,
      sales_invoice_invoice_reference: null,
      latest_comment: null,
      is_damaged: null,
      damage_notes: null,
    })
    const { data } = csvFor(nulled, liveColumnIds())
    expect(data).toBe(
      'BC-1,SN-1,IR-2020,,,,,CANON,Copier,,,1234,5,,,,,,,,,,,,,In Stock,PP OK,,,,,,,,,,,,,,,,,,,,,,"Jul 15, 2026",12,,',
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
    expect(csvFor(binRow, ['location']).data).toBe('BC-1,SN-1,IR-2020,NYC | A12')
  })

  it('reports an in-transit asset regardless of its stored location', () => {
    expect(csvFor(makeRow({ is_in_transit: true }), ['location']).data).toBe(
      'BC-1,SN-1,IR-2020,In transit',
    )
  })

  it('emits only the columns the viewer chose, in canonical order', () => {
    const { header } = csvFor(makeRow(), ['status'])
    expect(header).toBe('Barcode,Serial Number,Model,Status')
  })

  // The CSV preserves whatever order it is handed. It does not sort, so the row order
  // of an export is decided entirely by the caller — see useAssetSelection.
  it('writes rows in the order it is given', () => {
    const older = makeRow({ barcode: 'OLD', created_at: new Date(2026, 2, 5) })
    const newer = makeRow({ barcode: 'NEW', created_at: new Date(2026, 6, 15) })
    const barcodesOf = (rows: AssetSearchRow[]) =>
      searchPageRowsToCsv(rows, ['barcode'])
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
    // Formatted as "March 05, 2026", "April 10, 2026", "Jul 15, 2026": as text April leads.
    const rows = [
      makeRow({ barcode: 'JULY', created_at: new Date(2026, 6, 15) }),
      makeRow({ barcode: 'MARCH', created_at: new Date(2026, 2, 5) }),
      makeRow({ barcode: 'APRIL', created_at: new Date(2026, 3, 10) }),
    ]
    expect(sortedBarcodes(rows, 'created_at')).toEqual(['MARCH', 'APRIL', 'JULY'])
    expect(sortedBarcodes(rows, 'created_at', true)).toEqual(['JULY', 'APRIL', 'MARCH'])
  })

  it('orders every other date column chronologically too', () => {
    const dateColumns = ['arrival_created_at', 'hold_created_at'] as const
    for (const columnId of dateColumns) {
      const rows = [
        makeRow({ barcode: 'JULY', [columnId]: new Date(2026, 6, 15) }),
        makeRow({ barcode: 'MARCH', [columnId]: new Date(2026, 2, 5) }),
        makeRow({ barcode: 'APRIL', [columnId]: new Date(2026, 3, 10) }),
      ]
      expect(sortedBarcodes(rows, columnId)).toEqual(['MARCH', 'APRIL', 'JULY'])
    }
  })

  it('orders the departed date chronologically', () => {
    const rows = [
      makeRow({ barcode: 'JULY', departed_at: '2026-07-15' }),
      makeRow({ barcode: 'MARCH', departed_at: '2026-03-05' }),
      makeRow({ barcode: 'APRIL', departed_at: '2026-04-10' }),
    ]
    expect(sortedBarcodes(rows, 'departed_at')).toEqual(['MARCH', 'APRIL', 'JULY'])
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

  it('reads damage as three states, blank for an asset nobody has inspected', () => {
    const damageText = (isDamaged: boolean | null) =>
      csvFor(makeRow({ is_damaged: isDamaged }), ['is_damaged']).data
    expect(damageText(true)).toBe('BC-1,SN-1,IR-2020,Yes')
    expect(damageText(false)).toBe('BC-1,SN-1,IR-2020,No')
    expect(damageText(null)).toBe('BC-1,SN-1,IR-2020,')
  })

  it('exports the damage notes and sorts the never-inspected assets last', () => {
    expect(csvFor(makeRow({ damage_notes: 'Dented, side panel' }), ['damage_notes']).data).toBe(
      'BC-1,SN-1,IR-2020,"Dented, side panel"',
    )
    const rows = [
      makeRow({ barcode: 'UNKNOWN', is_damaged: null }),
      makeRow({ barcode: 'DAMAGED', is_damaged: true }),
      makeRow({ barcode: 'CLEAN', is_damaged: false }),
    ]
    expect(sortedBarcodes(rows, 'is_damaged')).toEqual(['CLEAN', 'DAMAGED', 'UNKNOWN'])
    expect(sortedBarcodes(rows, 'is_damaged', true)).toEqual(['DAMAGED', 'CLEAN', 'UNKNOWN'])
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
      'BC-1,SN-1,IR-2020,$400.00,28.6%',
    )
  })

  it('keeps the minus outside the dollar sign when an asset sold below cost', () => {
    expect(marginCsv({ cost_sale_price: 800, cost_total_cost: 1000 })).toBe(
      'BC-1,SN-1,IR-2020,-$200.00,-25.0%',
    )
  })

  it('writes off the whole cost when an asset left at a zero sale price', () => {
    expect(marginCsv({ cost_sale_price: 0, cost_total_cost: 500 })).toBe(
      'BC-1,SN-1,IR-2020,-$500.00,-100.0%',
    )
  })

  it('reports flat rather than a total loss when both the sale price and cost are zero', () => {
    expect(marginCsv({ cost_sale_price: 0, cost_total_cost: 0 })).toBe(
      'BC-1,SN-1,IR-2020,$0.00,0.0%',
    )
  })

  it('leaves both columns empty when either input is missing', () => {
    expect(marginCsv({ cost_sale_price: null, cost_total_cost: 500 })).toBe('BC-1,SN-1,IR-2020,,')
    expect(marginCsv({ cost_sale_price: 1400, cost_total_cost: null })).toBe('BC-1,SN-1,IR-2020,,')
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

  // Barcode alone stays pinned, as the identifier a reader scans a row by. Serial number
  // and model are default-on and open on the left, but scroll and reorder freely.
  it('pins barcode only, and defaults the identity columns on', () => {
    expect(PINNED_ASSET_COLUMN_IDS.filter((id) => id !== 'select')).toEqual(['barcode'])
    expect([...IDENTITY_COLUMN_IDS]).toEqual(['barcode', 'serial_number', 'model'])

    const idSection = ASSET_SEARCH_COLUMNS.filter((c) => c.section === 'identity').map((c) => c.id)
    expect(idSection).toEqual(ID_SECTION_COLUMN_IDS)
  })

  it('opens with the ID section, then General Specifications', () => {
    expect(ASSET_COLUMN_ORDER.slice(0, 7)).toEqual([
      'barcode',
      'serial_number',
      'model',
      'specs_meter_total',
      'specs_cassettes',
      'specs_internal_finisher',
      'accessories',
    ])
  })

  // writeCols compares a stored list against these arrays positionally to decide the param sits
  // at its default and can leave the URL. An id out of canonical order there would leave `cols`
  // stuck in every link, so the ordering is asserted rather than left to review.
  it('writes every default list in canonical order', () => {
    const defaultLists = [
      ...Object.values(DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST),
      ...Object.values(DEFAULT_VISIBLE_COLUMN_IDS_BY_SECTION),
      ASSETS_BY_SERIAL_NUMBER_DEFAULT_COLUMN_IDS,
      IDENTITY_COLUMN_IDS,
    ]

    for (const ids of defaultLists) {
      const wanted = new Set<string>(ids)
      expect(ids).toEqual(ASSET_COLUMN_ORDER.filter((id) => wanted.has(id)))
    }
  })

  it('keeps every column in a section the picker renders', () => {
    const renderedSections = new Set<string>(COLUMN_SECTIONS.map((section) => section.id))
    const orphaned = ASSET_SEARCH_COLUMNS.filter((c) => !renderedSections.has(c.section)).map(
      (c) => c.id,
    )

    expect(orphaned).toEqual([])
  })

  it('groups the pickable columns by section, in picker order', () => {
    const grouped = COLUMN_SECTIONS.map((section) => ({
      section: section.id,
      ids: ASSET_SEARCH_COLUMNS.filter((c) => c.section === section.id).map((c) => c.id),
    }))
    expect(grouped).toEqual([
      { section: 'identity', ids: ['barcode', 'serial_number'] },
      {
        section: 'general_specs',
        ids: [
          'model',
          'specs_meter_total',
          'specs_cassettes',
          'specs_internal_finisher',
          'accessories',
        ],
      },
      {
        section: 'detailed_specs',
        ids: [
          'brand',
          'asset_type',
          'country_of_origin',
          'manufactured_year',
          'weight',
          'size',
          'specs_toner_life_c',
          'specs_toner_life_m',
          'specs_toner_life_y',
          'specs_toner_life_k',
        ],
      },
      {
        section: 'cost',
        ids: [
          'cost_purchase_cost',
          'cost_transport_cost',
          'cost_transfer_cost',
          'cost_processing_cost',
          'cost_other_cost',
          'cost_parts_cost',
          'cost_total_cost',
          'cost_sale_price',
        ],
      },
      { section: 'status', ids: ['status', 'readiness', 'is_damaged', 'damage_notes'] },
      {
        section: 'arrival',
        ids: ['vendor', 'arrival_number', 'arrival_warehouse_code', 'arrival_created_at'],
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
        section: 'departure',
        ids: ['customer', 'salesperson', 'departure_number', 'departed_at'],
      },
      {
        section: 'invoice',
        ids: ['purchase_invoice_invoice_reference', 'sales_invoice_invoice_reference'],
      },
      { section: 'profitability', ids: ['gross_margin', 'margin_percent'] },
      {
        section: 'other',
        ids: ['location', 'created_at', 'stock_days', 'errors', 'latest_comment'],
      },
    ])
  })
})

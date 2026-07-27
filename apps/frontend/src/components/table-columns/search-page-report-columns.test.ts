import type { ColumnDef, HeaderContext } from '@tanstack/react-table'
import { isValidElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetSearchRow } from 'shared-types'
import { ASSET_SEARCH_COLUMNS, COLUMN_SECTIONS } from './asset-search-columns'
import { createSearchPageColumns } from './search-page-columns'
import { searchPageRowsToCsv } from './search-page-report-columns'

const CSV_ROW_DELIMITER = '\r\n'
const ALWAYS_VISIBLE_COLUMN_IDS = ['barcode', 'model']
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
  return createSearchPageColumns(noHref).map(columnId)
}

function csvFor(row: AssetSearchRow, ids: string[]): { header: string; data: string } {
  const [header, data] = searchPageRowsToCsv([row], new Set(ids)).split(CSV_ROW_DELIMITER)
  return { header, data }
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
    const liveColumns = createSearchPageColumns(noHref)
    const { header } = csvFor(makeRow(), liveColumns.map(columnId))
    expect(header.split(',')).toEqual(liveColumns.map(headerLabel))
  })

  it('writes the full header row', () => {
    const { header } = csvFor(makeRow(), liveColumnIds())
    expect(header).toBe(
      'Barcode,Brand,Model,Asset Type,Serial Number,Status,Readiness,Location,' +
        'Country of Origin,Total Meter,Weight,Size,Days Held,Cassettes,Internal Finisher,' +
        'Accessories,Toner Life C,Toner Life M,Toner Life Y,Toner Life K,Purchase Cost,' +
        'Transport Cost,Processing Cost,Total Cost,Sale Price,Hold #,Held By,Held For,' +
        'Hold Customer,Hold Created,Vendor,Created,Arrived At,Stock Days,Customer,' +
        'Departed At,Invoice #,Last Comment',
    )
  })

  it('runs every column value through its display formatter', () => {
    const { data } = csvFor(makeRow(), liveColumnIds())
    expect(data).toBe(
      'BC-1,Canon,IR-2020,Copier,SN-1,In Stock,PP OK,NYC | Receiving,' +
        'Japan,12 K,"1,234 lbs",5,26,2,FIN-1,' +
        '"Toner, Drum",80,70,60,50,"$1,234.00",' +
        '$200.00,$100.00,"$1,534.00","$3,000.00",H-1,Alice,Bob,' +
        'Acme Corp,"July 01, 2026",Big Vendor,"July 15, 2026","July 05, 2026",12,Retail Co,' +
        '"July 10, 2026",PI-100,Looks good',
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
      latest_comment: null,
    })
    const { data } = csvFor(nulled, liveColumnIds())
    expect(data).toBe(
      'BC-1,Canon,IR-2020,Copier,SN-1,In Stock,PP OK,,' +
        ',,"1,234 lbs",5,,,,' +
        ',,,,,,' +
        ',,,,,,,' +
        ',,,"July 15, 2026",,12,,' +
        ',,',
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
})

describe('asset column registry', () => {
  it('has a live table column for every registry entry', () => {
    const liveIds = new Set(liveColumnIds())
    const missing = ASSET_SEARCH_COLUMNS.filter((c) => !liveIds.has(c.id)).map((c) => c.id)
    expect(missing).toEqual([])
  })

  it('has a registry entry for every table column but the always-visible ones', () => {
    const registryIds = new Set<string>(ASSET_SEARCH_COLUMNS.map((c) => c.id))
    const unregistered = liveColumnIds().filter((id) => !registryIds.has(id))
    expect(unregistered).toEqual(ALWAYS_VISIBLE_COLUMN_IDS)
  })

  it('groups the pickable columns by section, in picker order', () => {
    const grouped = COLUMN_SECTIONS.map((section) => ({
      section: section.id,
      ids: ASSET_SEARCH_COLUMNS.filter((c) => c.section === section.id).map((c) => c.id),
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
          'stock_days',
          'created_at',
        ],
      },
      {
        section: 'specs',
        ids: [
          'country_of_origin',
          'specs_cassettes',
          'specs_internal_finisher',
          'accessories',
          'specs_meter_total',
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
          'cost_processing_cost',
          'cost_total_cost',
          'cost_sale_price',
        ],
      },
      { section: 'arrival', ids: ['vendor', 'arrival_created_at'] },
      { section: 'departure', ids: ['customer', 'departed_at'] },
      {
        section: 'hold',
        ids: [
          'hold_hold_number',
          'held_by',
          'hold_created_for',
          'hold_customer',
          'hold_created_at',
          'days_held',
        ],
      },
      { section: 'invoice', ids: ['purchase_invoice_invoice_number'] },
      { section: 'last_comment', ids: ['latest_comment'] },
    ])
  })
})

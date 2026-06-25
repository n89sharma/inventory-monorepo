import type { SearchList } from '@/ui-types/navigation-context'
import type { Permission } from 'shared-types'

export type ColumnSectionId =
  | 'specs'
  | 'cost'
  | 'arrival'
  | 'departure'
  | 'hold'
  | 'invoice'
  | 'general'
  | 'last_comment'

export type AssetTableColumn = {
  readonly id: string
  readonly label: string
  readonly section: ColumnSectionId
  readonly defaultColumn: boolean
  readonly enabled: boolean
  readonly permission?: Permission
}

export const COLUMN_SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'specs', label: 'Specs' },
  { id: 'cost', label: 'Cost' },
  { id: 'arrival', label: 'Arrival' },
  { id: 'departure', label: 'Departure' },
  { id: 'hold', label: 'Hold' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'last_comment', label: 'Last Comment' },
] as const satisfies readonly { id: ColumnSectionId; label: string }[]

export const ASSET_TABLE_COLUMNS = [
  // General
  {
    id: 'asset_type',
    label: 'Asset Type',
    section: 'general',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'serial_number',
    label: 'Serial Number',
    section: 'general',
    defaultColumn: true,
    enabled: true,
  },
  { id: 'status', label: 'Status', section: 'general', defaultColumn: true, enabled: true },
  { id: 'readiness', label: 'Readiness', section: 'general', defaultColumn: true, enabled: true },
  { id: 'location', label: 'Location', section: 'general', defaultColumn: false, enabled: true },
  { id: 'stock_days', label: 'Stock Days', section: 'general', defaultColumn: true, enabled: true },

  // Specs
  {
    id: 'country_of_origin',
    label: 'Country of Origin',
    section: 'specs',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'specs_cassettes',
    label: 'Cassettes',
    section: 'specs',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'specs_internal_finisher',
    label: 'Internal Finisher',
    section: 'specs',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'specs_meter_total',
    label: 'Total Meter',
    section: 'specs',
    defaultColumn: true,
    enabled: true,
  },
  { id: 'weight', label: 'Weight', section: 'specs', defaultColumn: false, enabled: true },
  { id: 'size', label: 'Size', section: 'specs', defaultColumn: false, enabled: true },
  {
    id: 'specs_toner_life_c',
    label: 'Toner Life C',
    section: 'specs',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'specs_toner_life_m',
    label: 'Toner Life M',
    section: 'specs',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'specs_toner_life_y',
    label: 'Toner Life Y',
    section: 'specs',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'specs_toner_life_k',
    label: 'Toner Life K',
    section: 'specs',
    defaultColumn: false,
    enabled: true,
  },

  // Cost
  {
    id: 'cost_purchase_cost',
    label: 'Purchase Cost',
    section: 'cost',
    defaultColumn: false,
    enabled: true,
    permission: 'view_purchase_price',
  },
  {
    id: 'cost_total_cost',
    label: 'Total Cost',
    section: 'cost',
    defaultColumn: false,
    enabled: true,
    permission: 'view_purchase_price',
  },
  {
    id: 'cost_sale_price',
    label: 'Sale Price',
    section: 'cost',
    defaultColumn: false,
    enabled: true,
    permission: 'view_sale_price',
  },

  // Arrival
  {
    id: 'arrival_arrival_number',
    label: 'Arrival #',
    section: 'arrival',
    defaultColumn: false,
    enabled: false,
  },
  { id: 'vendor', label: 'Vendor', section: 'arrival', defaultColumn: false, enabled: true },
  {
    id: 'arrival_warehouse',
    label: 'Arrival Warehouse',
    section: 'arrival',
    defaultColumn: false,
    enabled: false,
  },
  {
    id: 'arrival_transporter',
    label: 'Arrival Transporter',
    section: 'arrival',
    defaultColumn: false,
    enabled: false,
  },
  {
    id: 'arrival_created_by',
    label: 'Arrived By',
    section: 'arrival',
    defaultColumn: false,
    enabled: false,
  },
  {
    id: 'arrival_created_at',
    label: 'Arrived At',
    section: 'arrival',
    defaultColumn: false,
    enabled: true,
  },

  // Departure
  {
    id: 'departure_departure_number',
    label: 'Departure #',
    section: 'departure',
    defaultColumn: false,
    enabled: false,
  },
  {
    id: 'departure_warehouse',
    label: 'Departure Warehouse',
    section: 'departure',
    defaultColumn: false,
    enabled: false,
  },
  { id: 'customer', label: 'Customer', section: 'departure', defaultColumn: false, enabled: true },
  {
    id: 'departure_transporter',
    label: 'Departure Transporter',
    section: 'departure',
    defaultColumn: false,
    enabled: false,
  },
  {
    id: 'departure_created_by',
    label: 'Departed By',
    section: 'departure',
    defaultColumn: false,
    enabled: false,
  },
  {
    id: 'departed_at',
    label: 'Departed At',
    section: 'departure',
    defaultColumn: false,
    enabled: true,
  },

  // Hold
  {
    id: 'hold_hold_number',
    label: 'Hold #',
    section: 'hold',
    defaultColumn: false,
    enabled: false,
  },
  { id: 'held_by', label: 'Held By', section: 'hold', defaultColumn: false, enabled: true },
  {
    id: 'hold_created_for',
    label: 'Held For',
    section: 'hold',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'hold_customer',
    label: 'Hold Customer',
    section: 'hold',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'hold_created_at',
    label: 'Hold Created',
    section: 'hold',
    defaultColumn: false,
    enabled: true,
  },
  { id: 'days_held', label: 'Days Held', section: 'hold', defaultColumn: false, enabled: true },
  { id: 'hold_from_dt', label: 'Hold From', section: 'hold', defaultColumn: false, enabled: false },
  { id: 'hold_to_dt', label: 'Hold To', section: 'hold', defaultColumn: false, enabled: false },
  { id: 'hold_notes', label: 'Hold Notes', section: 'hold', defaultColumn: false, enabled: false },

  // Invoice
  {
    id: 'purchase_invoice_invoice_number',
    label: 'Invoice #',
    section: 'invoice',
    defaultColumn: false,
    enabled: true,
  },
  {
    id: 'purchase_invoice_is_cleared',
    label: 'Invoice Cleared',
    section: 'invoice',
    defaultColumn: false,
    enabled: false,
  },

  // Last Comment
  {
    id: 'latest_comment',
    label: 'Last Comment',
    section: 'last_comment',
    defaultColumn: false,
    enabled: true,
  },
] as const satisfies readonly AssetTableColumn[]

export type AssetColumnId = (typeof ASSET_TABLE_COLUMNS)[number]['id']

export const DEFAULT_VISIBLE_COLUMN_IDS: readonly string[] = ASSET_TABLE_COLUMNS.filter(
  (c) => c.defaultColumn,
).map((c) => c.id)

const INSTOCK_DEFAULT_COLUMN_IDS = [
  'serial_number',
  'status',
  'readiness',
  'specs_meter_total',
  'stock_days',
  'latest_comment',
] as const satisfies readonly AssetColumnId[]

const SOLD_DEFAULT_COLUMN_IDS = [
  'status',
  'specs_meter_total',
  'customer',
  'departed_at',
  'cost_sale_price',
] as const satisfies readonly AssetColumnId[]

const HELD_DEFAULT_COLUMN_IDS = [
  'serial_number',
  'specs_meter_total',
  'days_held',
  'hold_hold_number',
  'held_by',
  'hold_created_for',
  'hold_customer',
] as const satisfies readonly AssetColumnId[]

export const ASSETS_BY_SERIAL_NUMBER_DEFAULT_COLUMN_IDS = [
  'serial_number',
  'status',
  'arrival_created_at',
] as const satisfies readonly AssetColumnId[]

export const DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST = {
  all: DEFAULT_VISIBLE_COLUMN_IDS,
  instock: INSTOCK_DEFAULT_COLUMN_IDS,
  held: HELD_DEFAULT_COLUMN_IDS,
  sold: SOLD_DEFAULT_COLUMN_IDS,
  'price-check': DEFAULT_VISIBLE_COLUMN_IDS,
} as const satisfies Record<SearchList, readonly string[]>

export const ENABLED_ASSET_COLUMN_COUNT: number = ASSET_TABLE_COLUMNS.filter(
  (c) => c.enabled,
).length

const IDENTITY_REPORT_KEYS = ['barcode', 'brand', 'model'] as const

const COLUMN_ID_TO_REPORT_KEYS: Partial<Record<AssetColumnId, readonly string[]>> = {
  location: ['warehouse_code', 'zone', 'bin'],
  held_by: ['hold_created_by'],
  departed_at: ['departure_created_at'],
  // stock_days, latest_comment default to [id] (new backend keys of the same name)
}

export function buildExportColumnKeys(visibleColumns: Set<string>): string[] {
  const keys: string[] = [...IDENTITY_REPORT_KEYS]
  for (const col of ASSET_TABLE_COLUMNS) {
    if (!col.enabled || !visibleColumns.has(col.id)) continue
    keys.push(...(COLUMN_ID_TO_REPORT_KEYS[col.id] ?? [col.id]))
  }
  return [...new Set(keys)]
}

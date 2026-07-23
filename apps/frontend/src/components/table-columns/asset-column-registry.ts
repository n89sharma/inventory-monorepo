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

export type AssetColumn = {
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

export const ASSET_COLUMN_REGISTRY = [
  // General
  { id: 'brand', label: 'Brand', section: 'general', defaultColumn: false, enabled: true },
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
  { id: 'created_at', label: 'Created', section: 'general', defaultColumn: false, enabled: true },

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
    id: 'cost_transport_cost',
    label: 'Transport Cost',
    section: 'cost',
    defaultColumn: false,
    enabled: true,
    permission: 'view_purchase_price',
  },
  {
    id: 'cost_processing_cost',
    label: 'Processing Cost',
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
] as const satisfies readonly AssetColumn[]

export type AssetColumnId = (typeof ASSET_COLUMN_REGISTRY)[number]['id']

const DEFAULT_VISIBLE_COLUMN_IDS: readonly string[] = ASSET_COLUMN_REGISTRY.filter(
  (c) => c.defaultColumn,
).map((c) => c.id)

const ONHAND_DEFAULT_COLUMN_IDS = [
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

const HARVESTED_DEFAULT_COLUMN_IDS = [
  'status',
  'location',
  'specs_meter_total',
  'latest_comment',
] as const satisfies readonly AssetColumnId[]

export const ASSETS_BY_SERIAL_NUMBER_DEFAULT_COLUMN_IDS = [
  'serial_number',
  'status',
  'arrival_created_at',
] as const satisfies readonly AssetColumnId[]

export const DEFAULT_VISIBLE_COLUMN_IDS_BY_LIST = {
  all: DEFAULT_VISIBLE_COLUMN_IDS,
  onhand: ONHAND_DEFAULT_COLUMN_IDS,
  sold: SOLD_DEFAULT_COLUMN_IDS,
  harvested: HARVESTED_DEFAULT_COLUMN_IDS,
  'sold-report': DEFAULT_VISIBLE_COLUMN_IDS,
} as const satisfies Record<SearchList, readonly string[]>

const COLUMN_BY_ID = new Map<string, AssetColumn>(
  (ASSET_COLUMN_REGISTRY as readonly AssetColumn[]).map((c) => [c.id, c]),
)

// Filters a stored/shared set of column ids down to what the current viewer may see:
// drops unknown ids (columns removed since the view was saved) and permission-gated
// columns the viewer lacks. Applied when restoring a saved view.
export function resolveVisibleColumns(
  columnIds: readonly string[],
  can: (permission: Permission) => boolean,
): Set<string> {
  const resolved = new Set<string>()
  for (const id of columnIds) {
    const column = COLUMN_BY_ID.get(id)
    if (!column) continue
    if (column.permission && !can(column.permission)) continue
    resolved.add(id)
  }
  return resolved
}

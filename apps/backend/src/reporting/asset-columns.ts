import { differenceInCalendarDays } from 'date-fns'
import type { AssetDetails } from 'shared-types'
import type { ColumnDescriptor } from './column-descriptor.js'

const formatDate = (val: unknown): string | null => {
  if (val === null || val === undefined) return null
  if (val instanceof Date) return val.toISOString()
  return String(val)
}

const stockDays = (a: AssetDetails): number | null =>
  a.arrival ? differenceInCalendarDays(new Date(), a.arrival.created_at) : null

export const ASSET_COLUMNS = {
  barcode:         { key: 'barcode',         header: 'barcode',         accessor: (a) => a.barcode },
  serial_number:   { key: 'serial_number',   header: 'serial_number',   accessor: (a) => a.serial_number },
  model:           { key: 'model',           header: 'model',           accessor: (a) => a.model },
  brand:           { key: 'brand',           header: 'brand',           accessor: (a) => a.brand },
  asset_type:      { key: 'asset_type',      header: 'asset_type',      accessor: (a) => a.asset_type },
  status:          { key: 'status',          header: 'status',          accessor: (a) => a.status },
  readiness:       { key: 'readiness',       header: 'readiness',       accessor: (a) => a.readiness },

  warehouse_code:   { key: 'warehouse_code',   header: 'warehouse_code',   accessor: (a) => a.location?.warehouse_code ?? null },
  warehouse_street: { key: 'warehouse_street', header: 'warehouse_street', accessor: (a) => a.location?.warehouse_street ?? null },
  zone:             { key: 'zone',             header: 'zone',             accessor: (a) => a.location?.zone ?? null },
  bin:              { key: 'bin',              header: 'bin',              accessor: (a) => a.location?.bin ?? null },

  created_at:        { key: 'created_at',        header: 'created_at',        accessor: (a) => a.created_at, format: formatDate },
  country_of_origin: { key: 'country_of_origin', header: 'country_of_origin', accessor: (a) => a.country_of_origin },

  cost_purchase_cost:   { key: 'cost_purchase_cost',   header: 'cost_purchase_cost',   accessor: (a) => a.cost.purchase_cost,   permission: 'view_purchase_price' },
  cost_transport_cost:  { key: 'cost_transport_cost',  header: 'cost_transport_cost',  accessor: (a) => a.cost.transport_cost,  permission: 'view_purchase_price' },
  cost_processing_cost: { key: 'cost_processing_cost', header: 'cost_processing_cost', accessor: (a) => a.cost.processing_cost, permission: 'view_purchase_price' },
  cost_other_cost:      { key: 'cost_other_cost',      header: 'cost_other_cost',      accessor: (a) => a.cost.other_cost,      permission: 'view_purchase_price' },
  cost_parts_cost:      { key: 'cost_parts_cost',      header: 'cost_parts_cost',      accessor: (a) => a.cost.parts_cost,      permission: 'view_purchase_price' },
  cost_total_cost:      { key: 'cost_total_cost',      header: 'cost_total_cost',      accessor: (a) => a.cost.total_cost,      permission: 'view_purchase_price' },
  cost_sale_price:      { key: 'cost_sale_price',      header: 'cost_sale_price',      accessor: (a) => a.cost.sale_price,      permission: 'view_sale_price' },

  specs_cassettes:         { key: 'specs_cassettes',         header: 'specs_cassettes',         accessor: (a) => a.specs.cassettes },
  specs_internal_finisher: { key: 'specs_internal_finisher', header: 'specs_internal_finisher', accessor: (a) => a.specs.internal_finisher },
  specs_meter_black:       { key: 'specs_meter_black',       header: 'specs_meter_black',       accessor: (a) => a.specs.meter_black },
  specs_meter_colour:      { key: 'specs_meter_colour',      header: 'specs_meter_colour',      accessor: (a) => a.specs.meter_colour },
  specs_meter_total:       { key: 'specs_meter_total',       header: 'specs_meter_total',       accessor: (a) => a.specs.meter_total },
  specs_drum_life_c:       { key: 'specs_drum_life_c',       header: 'specs_drum_life_c',       accessor: (a) => a.specs.drum_life_c },
  specs_drum_life_m:       { key: 'specs_drum_life_m',       header: 'specs_drum_life_m',       accessor: (a) => a.specs.drum_life_m },
  specs_drum_life_y:       { key: 'specs_drum_life_y',       header: 'specs_drum_life_y',       accessor: (a) => a.specs.drum_life_y },
  specs_drum_life_k:       { key: 'specs_drum_life_k',       header: 'specs_drum_life_k',       accessor: (a) => a.specs.drum_life_k },
  specs_toner_life_c:      { key: 'specs_toner_life_c',      header: 'specs_toner_life_c',      accessor: (a) => a.specs.toner_life_c },
  specs_toner_life_m:      { key: 'specs_toner_life_m',      header: 'specs_toner_life_m',      accessor: (a) => a.specs.toner_life_m },
  specs_toner_life_y:      { key: 'specs_toner_life_y',      header: 'specs_toner_life_y',      accessor: (a) => a.specs.toner_life_y },
  specs_toner_life_k:      { key: 'specs_toner_life_k',      header: 'specs_toner_life_k',      accessor: (a) => a.specs.toner_life_k },

  hold_created_by:  { key: 'hold_created_by',  header: 'hold_created_by',  accessor: (a) => a.hold?.created_by },
  hold_created_for: { key: 'hold_created_for', header: 'hold_created_for', accessor: (a) => a.hold?.created_for },
  hold_created_at:  { key: 'hold_created_at',  header: 'hold_created_at',  accessor: (a) => a.hold?.created_at, format: formatDate },
  hold_customer:    { key: 'hold_customer',    header: 'hold_customer',    accessor: (a) => a.hold?.customer },
  hold_from_dt:     { key: 'hold_from_dt',     header: 'hold_from_dt',     accessor: (a) => a.hold?.from_dt, format: formatDate },
  hold_to_dt:       { key: 'hold_to_dt',       header: 'hold_to_dt',       accessor: (a) => a.hold?.to_dt,   format: formatDate },
  hold_notes:       { key: 'hold_notes',       header: 'hold_notes',       accessor: (a) => a.hold?.notes },
  hold_hold_number: { key: 'hold_hold_number', header: 'hold_hold_number', accessor: (a) => a.hold?.hold_number },

  arrival_arrival_number: { key: 'arrival_arrival_number', header: 'arrival_arrival_number', accessor: (a) => a.arrival?.arrival_number },
  vendor:                 { key: 'vendor',                 header: 'vendor',                 accessor: (a) => a.arrival?.origin },
  arrival_warehouse:      { key: 'arrival_warehouse',      header: 'arrival_warehouse',      accessor: (a) => a.arrival?.destination_code },
  arrival_transporter:    { key: 'arrival_transporter',    header: 'arrival_transporter',    accessor: (a) => a.arrival?.transporter },
  arrival_created_by:     { key: 'arrival_created_by',     header: 'arrival_created_by',     accessor: (a) => a.arrival?.created_by },
  arrival_created_at:     { key: 'arrival_created_at',     header: 'arrival_created_at',     accessor: (a) => a.arrival?.created_at, format: formatDate },

  departure_departure_number: { key: 'departure_departure_number', header: 'departure_departure_number', accessor: (a) => a.departure?.departure_number },
  departure_warehouse:        { key: 'departure_warehouse',        header: 'departure_warehouse',        accessor: (a) => a.departure?.origin_code },
  customer:                   { key: 'customer',                   header: 'customer',                   accessor: (a) => a.departure?.destination },
  departure_transporter:      { key: 'departure_transporter',      header: 'departure_transporter',      accessor: (a) => a.departure?.transporter },
  departure_created_by:       { key: 'departure_created_by',       header: 'departure_created_by',       accessor: (a) => a.departure?.created_by },
  departure_created_at:       { key: 'departure_created_at',       header: 'departure_created_at',       accessor: (a) => a.departure?.created_at, format: formatDate },

  purchase_invoice_invoice_number: { key: 'purchase_invoice_invoice_number', header: 'purchase_invoice_invoice_number', accessor: (a) => a.purchase_invoice?.invoice_number },
  purchase_invoice_is_cleared:     { key: 'purchase_invoice_is_cleared',     header: 'purchase_invoice_is_cleared',     accessor: (a) => a.purchase_invoice?.is_cleared },

  stock_days:     { key: 'stock_days',     header: 'stock_days',     accessor: (a) => stockDays(a) },
  latest_comment: { key: 'latest_comment', header: 'latest_comment', accessor: (a) => a.latest_comment },
} as const satisfies Record<string, ColumnDescriptor<AssetDetails>>

export type AssetColumnKey = keyof typeof ASSET_COLUMNS

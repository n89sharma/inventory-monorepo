import type { AssetColumnKey } from './asset-columns.js'

const BASE_SECTION = [
  'barcode',
  'serial_number',
  'brand',
  'model',
  'asset_type',
  'specs_meter_total',
  'status',
  'readiness',
  'vendor',
  'cost_purchase_cost',
  'created_at',
] as const satisfies readonly AssetColumnKey[]

const LOCATION_SECTION = [
  'warehouse_code',
  'zone',
  'bin',
] as const satisfies readonly AssetColumnKey[]

const COST_SECTION = [
  'cost_transport_cost',
  'cost_processing_cost',
  'cost_total_cost',
  'cost_sale_price',
] as const satisfies readonly AssetColumnKey[]

const SPECS_SECTION = [
  'country_of_origin',
  'specs_cassettes',
  'specs_internal_finisher',
  'specs_meter_black',
  'specs_meter_colour',
  'specs_drum_life_c',
  'specs_drum_life_m',
  'specs_drum_life_y',
  'specs_drum_life_k',
  'specs_toner_life_c',
  'specs_toner_life_m',
  'specs_toner_life_y',
  'specs_toner_life_k',
] as const satisfies readonly AssetColumnKey[]

const HOLD_SECTION = [
  'hold_hold_number',
  'hold_created_by',
  'hold_created_for',
  'hold_created_at',
  'hold_customer',
] as const satisfies readonly AssetColumnKey[]

const ARRIVAL_SECTION = [
  'arrival_arrival_number',
  'arrival_warehouse',
  'arrival_transporter',
  'arrival_created_at',
] as const satisfies readonly AssetColumnKey[]

const DEPARTURE_SECTION = [
  'departure_departure_number',
  'departure_warehouse',
  'customer',
  'departure_transporter',
  'departure_created_at',
] as const satisfies readonly AssetColumnKey[]

const INVOICE_SECTION = [
  'purchase_invoice_invoice_number',
  'purchase_invoice_is_cleared',
] as const satisfies readonly AssetColumnKey[]

const GENERAL_REPORT_COLUMNS = [
  ...BASE_SECTION,
  ...LOCATION_SECTION,
  ...COST_SECTION,
  ...SPECS_SECTION,
  ...ARRIVAL_SECTION,
  ...DEPARTURE_SECTION
] as const satisfies readonly AssetColumnKey[]

const ARRIVAL_REPORT_COLUMNS = [
  ...BASE_SECTION,
  ...SPECS_SECTION,
  ...ARRIVAL_SECTION
] as const satisfies readonly AssetColumnKey[]

const TRANSFER_REPORT_COLUMNS = [
  ...BASE_SECTION,
  ...COST_SECTION
] as const satisfies readonly AssetColumnKey[]

const DEPARTURE_REPORT_COLUMNS = [
  ...BASE_SECTION,
  ...COST_SECTION,
  ...DEPARTURE_SECTION
] as const satisfies readonly AssetColumnKey[]

const INVOICE_REPORT_COLUMNS = [
  ...BASE_SECTION,
  ...INVOICE_SECTION
] as const satisfies readonly AssetColumnKey[]

const HOLD_REPORT_COLUMNS = [
  ...BASE_SECTION,
  ...HOLD_SECTION
] as const satisfies readonly AssetColumnKey[]

export const REPORT_VARIANTS = {
  general_report: GENERAL_REPORT_COLUMNS,
  arrival_report: ARRIVAL_REPORT_COLUMNS,
  transfer_report: TRANSFER_REPORT_COLUMNS,
  departure_report: DEPARTURE_REPORT_COLUMNS,
  invoice_report: INVOICE_REPORT_COLUMNS,
  hold_report: HOLD_REPORT_COLUMNS
} as const satisfies Record<string, readonly AssetColumnKey[]>

export type ReportVariant = keyof typeof REPORT_VARIANTS

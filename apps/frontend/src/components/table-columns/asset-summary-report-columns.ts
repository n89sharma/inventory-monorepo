import { formatLocation, formatThousandsK, formatTitleCase } from '@/lib/formatters'
import { getReadinessDisplay } from '@/components/shared/readiness/readiness-config'
import type { AssetSummary } from 'shared-types'

export type CollectionSection = 'arrivals' | 'transfers' | 'departures' | 'invoices' | 'holds'

export type AssetReportColumn = {
  header: string
  value: (asset: AssetSummary) => string
}

const BARCODE_COLUMN: AssetReportColumn = { header: 'Barcode', value: (a) => a.barcode }
const BRAND_COLUMN: AssetReportColumn = { header: 'Brand', value: (a) => formatTitleCase(a.brand) }
const MODEL_COLUMN: AssetReportColumn = { header: 'Model', value: (a) => a.model }
const SERIAL_NUMBER_COLUMN: AssetReportColumn = {
  header: 'Serial Number',
  value: (a) => a.serial_number,
}
const STATUS_COLUMN: AssetReportColumn = {
  header: 'Status',
  value: (a) => formatTitleCase(a.status),
}
const READINESS_COLUMN: AssetReportColumn = {
  header: 'Readiness',
  value: (a) => getReadinessDisplay(a.readiness),
}
const TOTAL_METER_COLUMN: AssetReportColumn = {
  header: 'Total Meter',
  value: (a) => formatThousandsK(a.meter_total),
}
const CASSETTES_COLUMN: AssetReportColumn = {
  header: 'Cassettes',
  value: (a) => (a.cassettes == null ? '' : String(a.cassettes)),
}
const INTERNAL_FINISHER_COLUMN: AssetReportColumn = {
  header: 'Internal Finisher',
  value: (a) => a.internal_finisher ?? '',
}
const ACCESSORIES_COLUMN: AssetReportColumn = {
  header: 'Accessories',
  value: (a) => a.accessories.join(', '),
}
const LOCATION_COLUMN: AssetReportColumn = {
  header: 'Location',
  value: (a) => formatLocation(a.location),
}
const PURCHASE_INVOICE_COLUMN: AssetReportColumn = {
  header: 'Invoice',
  value: (a) => a.purchase_invoice_number ?? '',
}
const SALES_INVOICE_COLUMN: AssetReportColumn = {
  header: 'Invoice',
  value: (a) => a.sales_invoice_number ?? '',
}

const COMMON_REPORT_COLUMNS: AssetReportColumn[] = [
  BARCODE_COLUMN,
  BRAND_COLUMN,
  MODEL_COLUMN,
  SERIAL_NUMBER_COLUMN,
  STATUS_COLUMN,
  READINESS_COLUMN,
  TOTAL_METER_COLUMN,
  CASSETTES_COLUMN,
  INTERNAL_FINISHER_COLUMN,
  ACCESSORIES_COLUMN,
  LOCATION_COLUMN,
]

const ARRIVAL_REPORT_COLUMNS: AssetReportColumn[] = [
  BARCODE_COLUMN,
  BRAND_COLUMN,
  MODEL_COLUMN,
  SERIAL_NUMBER_COLUMN,
  PURCHASE_INVOICE_COLUMN,
  STATUS_COLUMN,
  READINESS_COLUMN,
  TOTAL_METER_COLUMN,
  CASSETTES_COLUMN,
  INTERNAL_FINISHER_COLUMN,
  ACCESSORIES_COLUMN,
  LOCATION_COLUMN,
]

const DEPARTURE_REPORT_COLUMNS: AssetReportColumn[] = [
  BARCODE_COLUMN,
  BRAND_COLUMN,
  MODEL_COLUMN,
  SERIAL_NUMBER_COLUMN,
  SALES_INVOICE_COLUMN,
  STATUS_COLUMN,
  READINESS_COLUMN,
  TOTAL_METER_COLUMN,
  CASSETTES_COLUMN,
  INTERNAL_FINISHER_COLUMN,
  ACCESSORIES_COLUMN,
  LOCATION_COLUMN,
]

export const REPORT_COLUMNS_BY_SECTION = {
  arrivals: ARRIVAL_REPORT_COLUMNS,
  transfers: COMMON_REPORT_COLUMNS,
  departures: DEPARTURE_REPORT_COLUMNS,
  invoices: COMMON_REPORT_COLUMNS,
  holds: COMMON_REPORT_COLUMNS,
} as const satisfies Record<CollectionSection, AssetReportColumn[]>

const CSV_ROW_DELIMITER = '\r\n'
const CSV_QUOTE_REQUIRED = /["\r\n,]/

function toCsvField(value: string): string {
  if (CSV_QUOTE_REQUIRED.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function toCsvRow(fields: string[]): string {
  return fields.map(toCsvField).join(',')
}

export function collectionAssetsToCsv(section: CollectionSection, assets: AssetSummary[]): string {
  const columns = REPORT_COLUMNS_BY_SECTION[section]
  const header = toCsvRow(columns.map((c) => c.header))
  const rows = assets.map((asset) => toCsvRow(columns.map((c) => c.value(asset))))
  return [header, ...rows].join(CSV_ROW_DELIMITER)
}

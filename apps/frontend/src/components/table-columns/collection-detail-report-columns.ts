import { formatLocation, formatThousandsK, formatTitleCase } from '@/lib/formatters'
import { toCsv, type CsvColumn } from '@/lib/csv'
import { getReadinessDisplay } from '@/components/shared/readiness/readiness-config'
import type { AssetSummary } from 'shared-types'

export type CollectionSection = 'arrivals' | 'transfers' | 'departures' | 'invoices' | 'holds'

export type CollectionDetailReportColumn = CsvColumn<AssetSummary>

const BARCODE_COLUMN: CollectionDetailReportColumn = { header: 'Barcode', value: (a) => a.barcode }
const BRAND_COLUMN: CollectionDetailReportColumn = {
  header: 'Brand',
  value: (a) => formatTitleCase(a.brand),
}
const MODEL_COLUMN: CollectionDetailReportColumn = { header: 'Model', value: (a) => a.model }
const SERIAL_NUMBER_COLUMN: CollectionDetailReportColumn = {
  header: 'Serial Number',
  value: (a) => a.serial_number,
}
const STATUS_COLUMN: CollectionDetailReportColumn = {
  header: 'Status',
  value: (a) => formatTitleCase(a.status),
}
const READINESS_COLUMN: CollectionDetailReportColumn = {
  header: 'Readiness',
  value: (a) => getReadinessDisplay(a.readiness),
}
const TOTAL_METER_COLUMN: CollectionDetailReportColumn = {
  header: 'Total Meter',
  value: (a) => formatThousandsK(a.meter_total),
}
const CASSETTES_COLUMN: CollectionDetailReportColumn = {
  header: 'Cassettes',
  value: (a) => (a.cassettes == null ? '' : String(a.cassettes)),
}
const INTERNAL_FINISHER_COLUMN: CollectionDetailReportColumn = {
  header: 'Internal Finisher',
  value: (a) => a.internal_finisher ?? '',
}
const ACCESSORIES_COLUMN: CollectionDetailReportColumn = {
  header: 'Accessories',
  value: (a) => a.accessories.join(', '),
}
const LOCATION_COLUMN: CollectionDetailReportColumn = {
  header: 'Location',
  value: (a) => formatLocation(a.location, a.is_in_transit),
}
const PURCHASE_INVOICE_COLUMN: CollectionDetailReportColumn = {
  header: 'Invoice',
  value: (a) => a.purchase_invoice_number ?? '',
}
const SALES_INVOICE_COLUMN: CollectionDetailReportColumn = {
  header: 'Invoice',
  value: (a) => a.sales_invoice_number ?? '',
}

const COMMON_REPORT_COLUMNS: CollectionDetailReportColumn[] = [
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

const ARRIVAL_REPORT_COLUMNS: CollectionDetailReportColumn[] = [
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

const DEPARTURE_REPORT_COLUMNS: CollectionDetailReportColumn[] = [
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

export const COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION = {
  arrivals: ARRIVAL_REPORT_COLUMNS,
  transfers: COMMON_REPORT_COLUMNS,
  departures: DEPARTURE_REPORT_COLUMNS,
  invoices: COMMON_REPORT_COLUMNS,
  holds: COMMON_REPORT_COLUMNS,
} as const satisfies Record<CollectionSection, CollectionDetailReportColumn[]>

export function collectionDetailToCsv(section: CollectionSection, assets: AssetSummary[]): string {
  return toCsv(COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION[section], assets)
}

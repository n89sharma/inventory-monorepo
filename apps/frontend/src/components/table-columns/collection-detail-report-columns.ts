import {
  formatLocation,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
} from '@/lib/formatters'
import { toCsv, type CsvColumn } from '@/lib/csv'
import { getReadinessDisplay } from '@/components/shared/readiness/readiness-config'
import type { AssetSummary } from 'shared-types'
import {
  PURCHASE_COST_COLUMNS,
  SALE_PRICE_COLUMN,
  type PricePermissions,
} from './collection-detail-columns'

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
  SERIAL_NUMBER_COLUMN,
  MODEL_COLUMN,
  BRAND_COLUMN,
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
  SERIAL_NUMBER_COLUMN,
  MODEL_COLUMN,
  PURCHASE_INVOICE_COLUMN,
  BRAND_COLUMN,
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
  SERIAL_NUMBER_COLUMN,
  MODEL_COLUMN,
  SALES_INVOICE_COLUMN,
  BRAND_COLUMN,
  STATUS_COLUMN,
  READINESS_COLUMN,
  TOTAL_METER_COLUMN,
  CASSETTES_COLUMN,
  INTERNAL_FINISHER_COLUMN,
  ACCESSORIES_COLUMN,
  LOCATION_COLUMN,
]

function costReportColumns({
  canViewPurchasePrice,
  canViewSalePrice,
}: PricePermissions): CollectionDetailReportColumn[] {
  const columns: CollectionDetailReportColumn[] = []
  if (canViewPurchasePrice) {
    for (const [field, header] of PURCHASE_COST_COLUMNS) {
      columns.push({ header, value: (a) => formatUSDWithSymbol(a.cost?.[field] ?? null) })
    }
  }
  if (canViewSalePrice) {
    const [field, header] = SALE_PRICE_COLUMN
    columns.push({ header, value: (a) => formatUSDWithSymbol(a.cost?.[field] ?? null) })
  }
  return columns
}

// Each section states its own full list, in the order its table renders them, so no caller
// has to know which sections carry prices.
export const COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION: Record<
  CollectionSection,
  (prices: PricePermissions) => CollectionDetailReportColumn[]
> = {
  arrivals: (prices) => [...ARRIVAL_REPORT_COLUMNS, ...costReportColumns(prices)],
  transfers: (prices) => [...COMMON_REPORT_COLUMNS, ...costReportColumns(prices)],
  departures: (prices) => [...DEPARTURE_REPORT_COLUMNS, ...costReportColumns(prices)],
  invoices: (prices) => [...COMMON_REPORT_COLUMNS, ...costReportColumns(prices)],
  holds: () => COMMON_REPORT_COLUMNS,
}

export function collectionDetailToCsv(
  section: CollectionSection,
  assets: AssetSummary[],
  prices: PricePermissions,
): string {
  return toCsv(COLLECTION_DETAIL_REPORT_COLUMNS_BY_SECTION[section](prices), assets)
}

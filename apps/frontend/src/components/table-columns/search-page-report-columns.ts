import { toCsv, type CsvColumn } from '@/lib/csv'
import {
  formatDate,
  formatLocation,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
  formatWeight,
} from '@/lib/formatters'
import { getReadinessDisplay } from '@/components/shared/readiness/readiness-config'
import type { AssetSearchRow } from 'shared-types'
import { daysHeld, stockDays } from './search-page-columns'

type SearchPageReportColumn = CsvColumn<AssetSearchRow> & {
  id: string
  alwaysVisible?: boolean
}

export const SEARCH_PAGE_REPORT_COLUMNS: SearchPageReportColumn[] = [
  { id: 'barcode', header: 'Barcode', alwaysVisible: true, value: (a) => a.barcode },
  { id: 'brand', header: 'Brand', value: (a) => formatTitleCase(a.brand) },
  { id: 'model', header: 'Model', alwaysVisible: true, value: (a) => a.model },
  { id: 'asset_type', header: 'Asset Type', value: (a) => formatTitleCase(a.asset_type) },
  { id: 'serial_number', header: 'Serial Number', value: (a) => a.serial_number },
  { id: 'status', header: 'Status', value: (a) => formatTitleCase(a.status) },
  { id: 'readiness', header: 'Readiness', value: (a) => getReadinessDisplay(a.readiness) },
  { id: 'location', header: 'Location', value: (a) => formatLocation(a.location, a.is_in_transit) },
  {
    id: 'country_of_origin',
    header: 'Country of Origin',
    value: (a) => formatTitleCase(a.country_of_origin ?? ''),
  },
  {
    id: 'specs_meter_total',
    header: 'Total Meter',
    value: (a) => formatThousandsK(a.specs_meter_total),
  },
  { id: 'weight', header: 'Weight', value: (a) => formatWeight(a.weight) },
  { id: 'size', header: 'Size', value: (a) => String(a.size) },
  {
    id: 'days_held',
    header: 'Days Held',
    value: (a) => {
      const held = daysHeld(a.hold_created_at)
      return held == null ? '' : String(held)
    },
  },
  {
    id: 'specs_cassettes',
    header: 'Cassettes',
    value: (a) => (a.specs_cassettes == null ? '' : String(a.specs_cassettes)),
  },
  {
    id: 'specs_internal_finisher',
    header: 'Internal Finisher',
    value: (a) => a.specs_internal_finisher ?? '',
  },
  {
    id: 'specs_toner_life_c',
    header: 'Toner Life C',
    value: (a) => (a.specs_toner_life_c == null ? '' : String(a.specs_toner_life_c)),
  },
  {
    id: 'specs_toner_life_m',
    header: 'Toner Life M',
    value: (a) => (a.specs_toner_life_m == null ? '' : String(a.specs_toner_life_m)),
  },
  {
    id: 'specs_toner_life_y',
    header: 'Toner Life Y',
    value: (a) => (a.specs_toner_life_y == null ? '' : String(a.specs_toner_life_y)),
  },
  {
    id: 'specs_toner_life_k',
    header: 'Toner Life K',
    value: (a) => (a.specs_toner_life_k == null ? '' : String(a.specs_toner_life_k)),
  },
  {
    id: 'cost_purchase_cost',
    header: 'Purchase Cost',
    value: (a) => formatUSDWithSymbol(a.cost_purchase_cost),
  },
  {
    id: 'cost_transport_cost',
    header: 'Transport Cost',
    value: (a) => formatUSDWithSymbol(a.cost_transport_cost),
  },
  {
    id: 'cost_processing_cost',
    header: 'Processing Cost',
    value: (a) => formatUSDWithSymbol(a.cost_processing_cost),
  },
  {
    id: 'cost_total_cost',
    header: 'Total Cost',
    value: (a) => formatUSDWithSymbol(a.cost_total_cost),
  },
  {
    id: 'cost_sale_price',
    header: 'Sale Price',
    value: (a) => formatUSDWithSymbol(a.cost_sale_price),
  },
  { id: 'hold_hold_number', header: 'Hold #', value: (a) => a.hold_hold_number ?? '' },
  { id: 'held_by', header: 'Held By', value: (a) => a.held_by ?? '' },
  { id: 'hold_created_for', header: 'Held For', value: (a) => a.hold_created_for ?? '' },
  {
    id: 'hold_customer',
    header: 'Hold Customer',
    value: (a) => formatTitleCase(a.hold_customer ?? ''),
  },
  { id: 'hold_created_at', header: 'Hold Created', value: (a) => formatDate(a.hold_created_at) },
  { id: 'vendor', header: 'Vendor', value: (a) => formatTitleCase(a.vendor ?? '') },
  { id: 'created_at', header: 'Created', value: (a) => formatDate(a.created_at) },
  {
    id: 'arrival_created_at',
    header: 'Arrived At',
    value: (a) => formatDate(a.arrival_created_at),
  },
  { id: 'stock_days', header: 'Stock Days', value: (a) => String(stockDays(a.created_at)) },
  { id: 'customer', header: 'Customer', value: (a) => formatTitleCase(a.customer ?? '') },
  { id: 'departed_at', header: 'Departed At', value: (a) => formatDate(a.departed_at) },
  {
    id: 'purchase_invoice_invoice_number',
    header: 'Invoice #',
    value: (a) => a.purchase_invoice_invoice_number ?? '',
  },
  { id: 'latest_comment', header: 'Last Comment', value: (a) => a.latest_comment ?? '' },
]

export function searchPageRowsToCsv(rows: AssetSearchRow[], visibleColumns: Set<string>): string {
  const columns = SEARCH_PAGE_REPORT_COLUMNS.filter(
    (c) => c.alwaysVisible || visibleColumns.has(c.id),
  )
  return toCsv(columns, rows)
}

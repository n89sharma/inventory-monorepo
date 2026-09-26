import { getReadinessDisplay } from '@/components/shared/readiness/readiness-config'
import { ReadinessIcon } from '@/components/shared/readiness/readiness-icon'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  ID_COLUMN_SIZE,
  IdLink,
  MODEL_COLUMN_SIZE,
  SERIAL_NUMBER_COLUMN_SIZE,
} from '@/components/table-columns/column-primitives'
import type { SummaryColumn } from '@/components/table-columns/summary-column'
import { COST_FIELD_LABELS } from '@/lib/cost-fields'
import {
  formatDate,
  formatThousands,
  formatThousandsK,
  formatTitleCase,
  formatUSDWithSymbol,
} from '@/lib/formatters'
import type { MonthEndReportAssetLine } from 'shared-types'

type MonthEndAssetColumn = SummaryColumn<MonthEndReportAssetLine, null>

const ON_HAND_LABEL = 'On-hand'
const IN_TRANSIT_LABEL = 'In transit'

function optionalNumber(value: number | null): string {
  return value === null ? '' : String(value)
}

function OptionalIdLink({ href, id }: { href: string; id: string | null }): React.ReactNode {
  if (id === null) return null
  return <IdLink to={href}>{id}</IdLink>
}

function costColumn(
  id: keyof typeof COST_FIELD_LABELS & keyof MonthEndReportAssetLine,
): MonthEndAssetColumn {
  return {
    id,
    label: COST_FIELD_LABELS[id],
    text: (row) => formatUSDWithSymbol(row[id]),
  }
}

export const MONTH_END_ASSET_COLUMNS: readonly MonthEndAssetColumn[] = [
  {
    id: 'barcode',
    label: 'Barcode',
    text: (row) => row.barcode,
    cell: (row) => <IdLink to={`/assets/${row.barcode}`}>{row.barcode}</IdLink>,
    size: ID_COLUMN_SIZE,
  },
  {
    id: 'city_code',
    label: 'Warehouse',
    text: (row) => row.city_code,
  },
  {
    id: 'is_in_transit',
    label: 'Category',
    text: (row) => (row.is_in_transit ? IN_TRANSIT_LABEL : ON_HAND_LABEL),
  },
  {
    id: 'brand_name',
    label: 'Brand',
    text: (row) => row.brand_name,
  },
  {
    id: 'model_name',
    label: 'Model',
    text: (row) => row.model_name,
    size: MODEL_COLUMN_SIZE,
  },
  {
    id: 'asset_type',
    label: 'Asset Type',
    text: (row) => formatTitleCase(row.asset_type),
  },
  {
    id: 'serial_number',
    label: 'Serial #',
    text: (row) => row.serial_number,
    size: SERIAL_NUMBER_COLUMN_SIZE,
  },
  {
    id: 'meter_total',
    label: 'Total Meter',
    csvHeader: 'Total Meter (K)',
    text: (row) => formatThousands(row.meter_total),
    cell: (row) => formatThousandsK(row.meter_total),
  },
  costColumn('purchase_cost'),
  costColumn('transport_cost'),
  costColumn('transfer_cost'),
  costColumn('processing_cost'),
  costColumn('other_cost'),
  costColumn('parts_cost'),
  {
    id: 'total_cost',
    label: 'Total Cost',
    text: (row) => formatUSDWithSymbol(row.total_cost),
  },
  {
    id: 'stock_date',
    label: 'Stock Date',
    text: (row) => formatDate(row.stock_date),
  },
  {
    id: 'stock_days',
    label: 'Stock Days',
    text: (row) => optionalNumber(row.stock_days),
  },
  {
    id: 'vendor_name',
    label: 'Arrival Vendor',
    text: (row) => row.vendor_name ?? '',
  },
  {
    id: 'accessories',
    label: 'Accessories',
    text: (row) => row.accessories.join(', '),
  },
  {
    id: 'cassettes',
    label: 'Cassettes',
    text: (row) => optionalNumber(row.cassettes),
  },
  {
    id: 'readiness',
    label: 'Readiness',
    text: (row) => getReadinessDisplay(row.readiness),
    cell: (row) => <ReadinessIcon status={row.readiness} />,
  },
  {
    id: 'status',
    label: 'Status',
    text: (row) => row.status,
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    id: 'hold_number',
    label: 'Hold #',
    text: (row) => row.hold_number ?? '',
    cell: (row) => <OptionalIdLink href={`/holds/${row.hold_number}`} id={row.hold_number} />,
  },
  {
    id: 'arrival_number',
    label: 'Arrival #',
    text: (row) => row.arrival_number ?? '',
    cell: (row) => (
      <OptionalIdLink href={`/arrivals/${row.arrival_number}`} id={row.arrival_number} />
    ),
  },
  {
    id: 'purchase_invoice_number',
    label: 'Invoice #',
    text: (row) => row.purchase_invoice_number ?? '',
    cell: (row) => (
      <OptionalIdLink
        href={`/invoices/${row.purchase_invoice_number}`}
        id={row.purchase_invoice_number}
      />
    ),
  },
  {
    id: 'transfer_number',
    label: 'Transfer #',
    text: (row) => row.transfer_number ?? '',
    cell: (row) => (
      <OptionalIdLink href={`/transfers/${row.transfer_number}`} id={row.transfer_number} />
    ),
  },
]

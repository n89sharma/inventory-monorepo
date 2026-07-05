import { Button } from '@/components/shadcn/button'
import type {
  InStockSummaryModelRow,
  InStockSummaryTableRow,
} from '@/lib/in-stock-summary-grouping'
import { formatTitleCase, formatUSDWithSymbol } from '@/lib/formatters'
import { METER_BAND_LABELS } from '@/lib/meter-band-display'
import { soldReportHref } from '@/lib/filters/serializers'
import {
  ArrowSquareOutIcon,
  ArrowsDownUpIcon,
  CaretDownIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import type { ColumnDef, Row, SortingFn } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

function isModelRow(row: InStockSummaryTableRow): row is InStockSummaryModelRow {
  return 'subRows' in row
}

function SortableHeader({ label, onToggle }: { label: string; onToggle: () => void }) {
  return (
    <Button variant="ghost" onClick={onToggle} className="h-auto whitespace-normal py-1">
      {label}
      <ArrowsDownUpIcon />
    </Button>
  )
}

// Sorts model rows by `compare`; band sub-rows always return 0 so they keep
// their fixed Low → Medium → High → Unknown order under any active sort.
function modelRowSorter(
  compare: (a: InStockSummaryModelRow, b: InStockSummaryModelRow) => number,
): SortingFn<InStockSummaryTableRow> {
  return (a, b) => {
    if (!isModelRow(a.original) || !isModelRow(b.original)) return 0
    return compare(a.original, b.original)
  }
}

function nullsLow(value: number | null): number {
  return value ?? Number.NEGATIVE_INFINITY
}

const sortByModelCount = modelRowSorter((a, b) => a.asset_count - b.asset_count)
const sortByModelName = modelRowSorter((a, b) => a.model_name.localeCompare(b.model_name))
const sortByPurchaseCost = modelRowSorter(
  (a, b) => nullsLow(a.avg_purchase_cost) - nullsLow(b.avg_purchase_cost),
)
const sortByTotalCost = modelRowSorter(
  (a, b) => nullsLow(a.avg_total_cost) - nullsLow(b.avg_total_cost),
)

function ExpanderCell({ row }: { row: Row<InStockSummaryTableRow> }): React.JSX.Element | null {
  if (!isModelRow(row.original)) return null
  const CaretIcon = row.getIsExpanded() ? CaretDownIcon : CaretRightIcon
  return <CaretIcon className="size-4 text-muted-foreground" aria-hidden="true" />
}

function ModelCell({ row }: { row: Row<InStockSummaryTableRow> }): React.JSX.Element | null {
  if (!isModelRow(row.original)) return null
  return <span className="font-medium text-foreground">{row.original.model_name}</span>
}

function meterBandCell(row: Row<InStockSummaryTableRow>): string {
  const bandRow = row.original
  if (isModelRow(bandRow)) return ''
  return METER_BAND_LABELS[bandRow.meter_band]
}

function SoldReportCell({ row }: { row: Row<InStockSummaryTableRow> }): React.JSX.Element | null {
  if (!isModelRow(row.original)) return null
  const { model_id, model_name } = row.original
  return (
    <Link
      to={soldReportHref(model_id)}
      aria-label={`Sold report for ${model_name}`}
      className="inline-flex text-muted-foreground hover:text-foreground"
    >
      <ArrowSquareOutIcon className="size-4" />
    </Link>
  )
}

function scopeCell(
  row: Row<InStockSummaryTableRow>,
  value: (row: InStockSummaryModelRow) => string,
) {
  if (isModelRow(row.original)) return value(row.original)
  return ''
}

export const IN_STOCK_SUMMARY_COLUMNS: ColumnDef<InStockSummaryTableRow>[] = [
  {
    id: 'expander',
    header: '',
    enableSorting: false,
    cell: ({ row }) => <ExpanderCell row={row} />,
    size: 36,
  },
  {
    accessorKey: 'city_code',
    header: 'Warehouse',
    cell: ({ row }) => scopeCell(row, (r) => r.city_code),
    size: 80,
  },
  {
    accessorKey: 'brand_name',
    header: 'Brand',
    cell: ({ row }) => scopeCell(row, (r) => formatTitleCase(r.brand_name)),
    size: 100,
  },
  {
    accessorKey: 'asset_type',
    header: 'Asset Type',
    cell: ({ row }) => scopeCell(row, (r) => formatTitleCase(r.asset_type)),
    size: 100,
  },
  {
    accessorKey: 'model_name',
    header: ({ column }) => (
      <SortableHeader
        label="Model"
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => <ModelCell row={row} />,
    sortingFn: sortByModelName,
    size: 150,
  },
  {
    id: 'meter_band',
    header: 'Meter Band',
    cell: ({ row }) => meterBandCell(row),
    size: 100,
  },
  {
    accessorKey: 'avg_purchase_cost',
    header: ({ column }) => (
      <SortableHeader
        label="Avg Purchase Cost"
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => formatUSDWithSymbol(row.original.avg_purchase_cost),
    sortingFn: sortByPurchaseCost,
    size: 120,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    accessorKey: 'avg_total_cost',
    header: ({ column }) => (
      <SortableHeader
        label="Avg Total Cost"
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => formatUSDWithSymbol(row.original.avg_total_cost),
    sortingFn: sortByTotalCost,
    size: 120,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    accessorKey: 'asset_count',
    header: ({ column }) => (
      <SortableHeader
        label="Count"
        onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      />
    ),
    cell: ({ row }) => row.original.asset_count,
    sortingFn: sortByModelCount,
    size: 90,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    id: 'sold_report',
    header: 'Sold Report',
    enableSorting: false,
    cell: ({ row }) => <SoldReportCell row={row} />,
    size: 90,
  },
]

import { Button } from '@/components/shadcn/button'
import { formatTitleCase, formatUSDWithSymbol } from '@/lib/formatters'
import { METER_BAND_LABELS } from '@/lib/meter-band-display'
import { inStockDrilldownHref, soldReportHref } from '@/lib/search-in-stock-summary-params'
import { ArrowSquareOutIcon, ArrowsDownUpIcon } from '@phosphor-icons/react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import type { InStockSummaryRow } from 'shared-types'

function SortableHeader({ label, onToggle }: { label: string; onToggle: () => void }) {
  return (
    <Button variant="ghost" onClick={onToggle} className="h-auto whitespace-normal py-1">
      {label}
      <ArrowsDownUpIcon />
    </Button>
  )
}

export const IN_STOCK_SUMMARY_COLUMNS: ColumnDef<InStockSummaryRow>[] = [
  {
    accessorKey: 'city_code',
    header: 'Warehouse',
    cell: ({ row }) => row.original.city_code,
    size: 80,
  },
  {
    accessorKey: 'brand_name',
    header: 'Brand',
    cell: ({ row }) => formatTitleCase(row.original.brand_name),
    size: 100,
  },
  {
    accessorKey: 'asset_type',
    header: 'Asset Type',
    cell: ({ row }) => formatTitleCase(row.original.asset_type),
    size: 100,
  },
  {
    accessorKey: 'model_name',
    header: 'Model',
    cell: ({ row }) => (
      <Link
        to={inStockDrilldownHref(row.original)}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.model_name}
      </Link>
    ),
    size: 150,
  },
  {
    accessorKey: 'meter_band',
    header: 'Meter Band',
    cell: ({ row }) => METER_BAND_LABELS[row.original.meter_band],
    size: 100,
  },
  {
    accessorKey: 'avg_purchase_cost',
    header: 'Avg Purchase Cost',
    cell: ({ row }) => formatUSDWithSymbol(row.original.avg_purchase_cost),
    size: 120,
    meta: { cellClassName: 'text-right tabular-nums' },
  },
  {
    accessorKey: 'avg_total_cost',
    header: 'Avg Total Cost',
    cell: ({ row }) => formatUSDWithSymbol(row.original.avg_total_cost),
    size: 120,
    meta: { cellClassName: 'text-right tabular-nums' },
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
    size: 90,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    id: 'sold_report',
    header: 'Sold Report',
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        to={soldReportHref(row.original.model_id)}
        aria-label={`Sold report for ${row.original.model_name}`}
        className="inline-flex text-muted-foreground hover:text-foreground"
      >
        <ArrowSquareOutIcon className="size-4" />
      </Link>
    ),
    size: 90,
  },
]

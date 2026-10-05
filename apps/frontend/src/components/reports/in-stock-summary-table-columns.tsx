import type { InStockSummaryModelRow } from '@/lib/in-stock-summary-grouping'
import { formatTitleCase, formatUSDWithSymbol } from '@/lib/formatters'
import { modelPriceHistoryHref } from '@/lib/filters/serializers'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import type { ColumnDef, Row, SortingFn } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

function nullsLow(value: number | null): number {
  return value ?? Number.NEGATIVE_INFINITY
}

function rowSorter(
  compare: (a: InStockSummaryModelRow, b: InStockSummaryModelRow) => number,
): SortingFn<InStockSummaryModelRow> {
  return (a, b) => compare(a.original, b.original)
}

const sortByPurchaseCost = rowSorter(
  (a, b) => nullsLow(a.avg_purchase_cost) - nullsLow(b.avg_purchase_cost),
)
const sortByTotalCost = rowSorter((a, b) => nullsLow(a.avg_total_cost) - nullsLow(b.avg_total_cost))

function PriceHistoryCell({ row }: { row: Row<InStockSummaryModelRow> }): React.JSX.Element {
  const { model_id, model_name } = row.original
  return (
    <Link
      to={modelPriceHistoryHref(model_id)}
      aria-label={`Price history for ${model_name}`}
      className="inline-flex text-muted-foreground hover:text-foreground"
    >
      <ArrowSquareOutIcon className="size-4" />
    </Link>
  )
}

export const IN_STOCK_SUMMARY_COLUMNS: ColumnDef<InStockSummaryModelRow>[] = [
  {
    accessorKey: 'brand_name',
    header: 'Brand',
  },
  {
    accessorKey: 'asset_type',
    header: 'Asset Type',
    cell: ({ row }) => formatTitleCase(row.original.asset_type),
  },
  {
    accessorKey: 'model_name',
    header: 'Model',
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.model_name}</span>
    ),
  },
  {
    accessorKey: 'avg_purchase_cost',
    header: 'Avg Purchase Cost',
    cell: ({ row }) => formatUSDWithSymbol(row.original.avg_purchase_cost),
    sortingFn: sortByPurchaseCost,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    accessorKey: 'avg_total_cost',
    header: 'Avg Total Cost',
    cell: ({ row }) => formatUSDWithSymbol(row.original.avg_total_cost),
    sortingFn: sortByTotalCost,
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    accessorKey: 'asset_count',
    header: 'In Stock',
    meta: { cellClassName: 'text-center tabular-nums' },
  },
  {
    id: 'price_history',
    header: 'Price History',
    enableSorting: false,
    cell: ({ row }) => <PriceHistoryCell row={row} />,
  },
]

import type { StockSalesModelRow } from '@/lib/stock-sales-grouping'
import { formatMarginPercent, formatTitleCase, formatUSDWithSymbol } from '@/lib/formatters'
import type { SalesWindowMonths } from '@/lib/filters/parsers'
import { modelPriceHistoryHref } from '@/lib/filters/serializers'
import { ArrowSquareOutIcon } from '@phosphor-icons/react'
import type { ColumnDef, Row, SortingFn } from '@tanstack/react-table'
import { Link } from 'react-router-dom'

function nullsLow(value: number | null): number {
  return value ?? Number.NEGATIVE_INFINITY
}

function rowSorter(
  compare: (a: StockSalesModelRow, b: StockSalesModelRow) => number,
): SortingFn<StockSalesModelRow> {
  return (a, b) => compare(a.original, b.original)
}

const sortByPurchaseCost = rowSorter(
  (a, b) => nullsLow(a.avg_purchase_cost) - nullsLow(b.avg_purchase_cost),
)
const sortByTotalCost = rowSorter((a, b) => nullsLow(a.avg_total_cost) - nullsLow(b.avg_total_cost))
const sortBySalePrice = rowSorter(
  (a, b) => nullsLow(a.median_sale_price) - nullsLow(b.median_sale_price),
)
const sortByMargin = rowSorter((a, b) => nullsLow(a.margin_percent) - nullsLow(b.margin_percent))
const sortByProfit = rowSorter((a, b) => nullsLow(a.profit) - nullsLow(b.profit))

function PriceHistoryCell({
  row,
  months,
}: {
  row: Row<StockSalesModelRow>
  months: SalesWindowMonths
}): React.JSX.Element {
  const { model_id, model_name } = row.original
  return (
    <Link
      to={modelPriceHistoryHref(model_id, months)}
      aria-label={`Price history for ${model_name}`}
      className="inline-flex text-muted-foreground hover:text-foreground"
    >
      <ArrowSquareOutIcon className="size-4" />
    </Link>
  )
}

export function createStockSalesColumns(
  months: SalesWindowMonths,
): ColumnDef<StockSalesModelRow>[] {
  return [
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
      accessorKey: 'in_stock_count',
      header: 'In Stock',
      meta: { cellClassName: 'text-center tabular-nums' },
    },
    {
      accessorKey: 'held_count',
      header: 'Held',
      meta: { cellClassName: 'text-center tabular-nums' },
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
      accessorKey: 'median_sale_price',
      header: 'Median Sale Price',
      cell: ({ row }) => formatUSDWithSymbol(row.original.median_sale_price),
      sortingFn: sortBySalePrice,
      meta: { cellClassName: 'text-center tabular-nums' },
    },
    {
      accessorKey: 'margin_percent',
      header: 'Margin %',
      cell: ({ row }) => formatMarginPercent(row.original.margin_percent ?? undefined),
      sortingFn: sortByMargin,
      meta: { cellClassName: 'text-center tabular-nums' },
    },
    {
      accessorKey: 'sales_count',
      header: 'Sales',
      meta: { cellClassName: 'text-center tabular-nums' },
    },
    {
      accessorKey: 'profit',
      header: 'Profit',
      cell: ({ row }) => formatUSDWithSymbol(row.original.profit),
      sortingFn: sortByProfit,
      meta: { cellClassName: 'text-center tabular-nums' },
    },
    {
      id: 'price_history',
      header: 'Price History',
      enableSorting: false,
      cell: ({ row }) => <PriceHistoryCell row={row} months={months} />,
    },
  ]
}

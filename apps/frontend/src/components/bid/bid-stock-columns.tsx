import type { PickerColumn } from '@/components/shared/column-picker'
import { ModelPriceHistoryLink } from '@/components/shared/model-price-history-link'
import type { SalesWindowMonths } from '@/lib/filters/parsers'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { BidModelStock, BidRow } from 'shared-types'

export const STOCK_SECTION_ID = 'stock'

const STOCK_COLUMN_LABELS = {
  in_stock_count: 'In Stock',
  held_count: 'Held',
  median_sale_price: 'Median Sale Price',
  sales_count: 'Sales',
  price_history: 'Price History',
} as const

type StockFigure = Exclude<keyof typeof STOCK_COLUMN_LABELS, 'price_history'>

const STOCK_CELL_CLASS = 'text-center tabular-nums'

export type BidModelStockLookup = {
  byModel: ReadonlyMap<number, BidModelStock>
  months: SalesWindowMonths
}

function figureColumn(
  figure: StockFigure,
  lookup: BidModelStockLookup,
  format: (value: number) => string,
): ColumnDef<BidRow> {
  return {
    id: figure,
    header: STOCK_COLUMN_LABELS[figure],
    accessorFn: (row) => {
      if (row.model === null) return undefined
      return lookup.byModel.get(row.model.id)?.[figure] ?? undefined
    },
    sortUndefined: 'last',
    cell: ({ getValue }) => {
      const value = getValue<number | undefined>()
      return value === undefined ? '' : format(value)
    },
    meta: { cellClassName: STOCK_CELL_CLASS },
  }
}

function priceHistoryColumn(lookup: BidModelStockLookup): ColumnDef<BidRow> {
  return {
    id: 'price_history',
    header: STOCK_COLUMN_LABELS.price_history,
    enableSorting: false,
    meta: { cellClassName: STOCK_CELL_CLASS },
    cell: ({ row }) => {
      const { model } = row.original
      if (model === null) return null
      return (
        <ModelPriceHistoryLink modelId={model.id} modelName={model.name} months={lookup.months} />
      )
    },
  }
}

export function onHandColumns(lookup: BidModelStockLookup): ColumnDef<BidRow>[] {
  return [
    figureColumn('in_stock_count', lookup, String),
    figureColumn('held_count', lookup, String),
  ]
}

export function salesColumns(lookup: BidModelStockLookup): ColumnDef<BidRow>[] {
  return [
    figureColumn('median_sale_price', lookup, formatUSDWithSymbol),
    figureColumn('sales_count', lookup, String),
    priceHistoryColumn(lookup),
  ]
}

export function stockPickerColumns(): PickerColumn[] {
  return Object.entries(STOCK_COLUMN_LABELS).map(([id, label]) => ({
    id,
    label,
    section: STOCK_SECTION_ID,
  }))
}

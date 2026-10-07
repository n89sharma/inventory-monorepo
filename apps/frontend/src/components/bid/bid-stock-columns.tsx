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
const STOCK_HEADER_CLASS = 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100'
const STOCK_COLUMN_META = { cellClassName: STOCK_CELL_CLASS, headerClassName: STOCK_HEADER_CLASS }

export type BidRowWithStock = BidRow & { model_stock: BidModelStock | null }

export function withModelStock(
  rows: readonly BidRow[],
  modelStock: readonly BidModelStock[],
): BidRowWithStock[] {
  const stockByModel = new Map(modelStock.map((stock) => [stock.model_id, stock]))
  return rows.map((row) => ({
    ...row,
    model_stock: row.model === null ? null : (stockByModel.get(row.model.id) ?? null),
  }))
}

function figureColumn(
  figure: StockFigure,
  format: (value: number) => string,
): ColumnDef<BidRowWithStock> {
  return {
    id: figure,
    header: STOCK_COLUMN_LABELS[figure],
    accessorFn: (row) => row.model_stock?.[figure] ?? undefined,
    sortUndefined: 'last',
    cell: ({ getValue }) => {
      const value = getValue<number | undefined>()
      return value === undefined ? '' : format(value)
    },
    meta: STOCK_COLUMN_META,
  }
}

function priceHistoryColumn(months: SalesWindowMonths): ColumnDef<BidRowWithStock> {
  return {
    id: 'price_history',
    header: STOCK_COLUMN_LABELS.price_history,
    enableSorting: false,
    meta: STOCK_COLUMN_META,
    cell: ({ row }) => {
      const { model } = row.original
      if (model === null) return null
      return <ModelPriceHistoryLink modelId={model.id} modelName={model.name} months={months} />
    },
  }
}

export function onHandColumns(): ColumnDef<BidRowWithStock>[] {
  return [figureColumn('in_stock_count', String), figureColumn('held_count', String)]
}

export function salesColumns(months: SalesWindowMonths): ColumnDef<BidRowWithStock>[] {
  return [
    figureColumn('median_sale_price', formatUSDWithSymbol),
    figureColumn('sales_count', String),
    priceHistoryColumn(months),
  ]
}

export function stockPickerColumns(): PickerColumn[] {
  return Object.entries(STOCK_COLUMN_LABELS).map(([id, label]) => ({
    id,
    label,
    section: STOCK_SECTION_ID,
  }))
}

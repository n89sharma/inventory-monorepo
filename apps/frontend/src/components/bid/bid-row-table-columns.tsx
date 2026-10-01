import { ZERO_PRICE_LABEL, ZeroPriceToggle } from '@/components/bid/zero-price-toggle'
import { EditableAmountCell } from '@/components/shared/editable-amount-cell'
import { createSelectColumn } from '@/components/table-columns/column-primitives'
import { classifyBidColumns, type BidColumn } from '@/lib/bid-column-recognition'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { PriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { BidRow } from 'shared-types'

const BID_PRICE_FIELDS = ['selling_price', 'transport_cost'] as const

export type BidPriceField = (typeof BID_PRICE_FIELDS)[number]

const BID_PRICE_FIELD_LABELS = {
  selling_price: 'Selling Price',
  transport_cost: 'Freight',
} as const satisfies Record<BidPriceField, string>

const PASTED_COLUMN_ID_PREFIX = 'cell_'
const BLANK_BID_AMOUNT = null
const AMOUNT_COLUMN_SIZE = 120
const RECOGNIZED_HEADER_CLASS =
  'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
const UNRECOGNIZED_HEADER_CLASS = 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'

export function isPastedColumnId(columnId: string): boolean {
  return columnId.startsWith(PASTED_COLUMN_ID_PREFIX)
}

function bidPriceFieldForColumn(columnId: string): BidPriceField | undefined {
  return BID_PRICE_FIELDS.find((field) => field === columnId)
}

export type BidRowEditing = {
  editorRegistry: PriceCellEditorRegistry<BidPriceField>
  saveField: (rowId: number, field: BidPriceField, value: number | null) => Promise<void>
  toggleZeroPrice: (row: BidRow) => Promise<void>
}

function pastedColumn(column: BidColumn): ColumnDef<BidRow> {
  return {
    id: `${PASTED_COLUMN_ID_PREFIX}${column.index}`,
    header: column.label,
    accessorFn: (row) => row.cells[column.index] ?? '',
    meta: {
      headerClassName: column.recognized ? RECOGNIZED_HEADER_CLASS : UNRECOGNIZED_HEADER_CLASS,
    },
  }
}

function priceColumn(field: BidPriceField, editing: BidRowEditing | undefined): ColumnDef<BidRow> {
  const label = BID_PRICE_FIELD_LABELS[field]
  if (!editing) {
    return {
      accessorKey: field,
      header: label,
      cell: ({ row }) => formatUSDWithSymbol(row.original[field]),
    }
  }
  return {
    accessorKey: field,
    header: label,
    size: AMOUNT_COLUMN_SIZE,
    meta: { cellClassName: 'py-0' },
    cell: ({ row, table }) => (
      <EditableAmountCell
        row={row}
        table={table}
        field={field}
        value={row.original[field]}
        blankValue={BLANK_BID_AMOUNT}
        label={`${label} for row ${row.index + 1}`}
        editorRegistry={editing.editorRegistry}
        fieldForColumn={bidPriceFieldForColumn}
        onSave={(value) => editing.saveField(row.original.id, field, value)}
      />
    ),
  }
}

function zeroPriceColumn(editing: BidRowEditing | undefined): ColumnDef<BidRow> {
  return {
    accessorKey: 'zero_priced',
    header: ZERO_PRICE_LABEL,
    enableSorting: false,
    cell: ({ row }) => {
      if (editing) return <ZeroPriceToggle row={row.original} onToggle={editing.toggleZeroPrice} />
      return row.original.zero_priced ? ZERO_PRICE_LABEL : ''
    },
  }
}

function pricingColumns(editing: BidRowEditing | undefined): ColumnDef<BidRow>[] {
  return [
    priceColumn('selling_price', editing),
    priceColumn('transport_cost', editing),
    {
      accessorKey: 'margin_percent',
      header: 'Margin',
      cell: ({ row }) =>
        row.original.margin_percent === null ? '' : `${row.original.margin_percent}%`,
    },
    {
      accessorKey: 'bid_price',
      header: 'Bid Price',
      cell: ({ row }) => formatUSDWithSymbol(row.original.bid_price),
    },
    zeroPriceColumn(editing),
  ]
}

export function buildBidGridColumns(
  headers: readonly string[],
  editing: BidRowEditing | undefined,
): ColumnDef<BidRow>[] {
  const pasted = classifyBidColumns(headers)
  const recognized = pasted.filter((column) => column.recognized).map(pastedColumn)
  const unrecognized = pasted.filter((column) => !column.recognized).map(pastedColumn)
  const select = editing ? [createSelectColumn<BidRow>()] : []
  return [...select, ...recognized, ...pricingColumns(editing), ...unrecognized]
}

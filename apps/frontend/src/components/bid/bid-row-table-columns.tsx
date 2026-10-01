import { NO_BID_LABEL, NoBidToggle } from '@/components/bid/no-bid-toggle'
import type { PickerColumn, PickerSection } from '@/components/shared/column-picker'
import { EditableAmountCell } from '@/components/shared/editable-amount-cell'
import { createSelectColumn } from '@/components/table-columns/column-primitives'
import { classifyBidColumns, type BidColumn } from '@/lib/bid-column-recognition'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { PriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { BidRow } from 'shared-types'

const BID_PRICE_FIELDS = ['selling_price', 'transport_cost'] as const

export type BidPriceField = (typeof BID_PRICE_FIELDS)[number]

const PRICING_COLUMN_LABELS = {
  selling_price: 'Selling Price',
  transport_cost: 'Freight',
  margin_percent: 'Margin',
  bid_price: 'Bid Price',
  zero_priced: NO_BID_LABEL,
} as const

const SHEET_SECTION_ID = 'sheet'
const PRICING_SECTION_ID = 'pricing'

export const BID_COLUMN_SECTIONS = [
  { id: SHEET_SECTION_ID, label: 'Vendor Sheet' },
  { id: PRICING_SECTION_ID, label: 'Pricing' },
] as const satisfies readonly PickerSection[]

const PASTED_COLUMN_ID_PREFIX = 'cell_'
const INHERITED_VALUE_CLASS = 'text-muted-foreground'
const BLANK_BID_AMOUNT = null
const AMOUNT_COLUMN_SIZE = 120
const RECOGNIZED_HEADER_CLASS =
  'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'
const UNRECOGNIZED_HEADER_CLASS = 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'

const NO_BID_ROW_CLASS = 'data-row-muted'

export function bidRowClassName(row: BidRow): string | undefined {
  return row.zero_priced ? NO_BID_ROW_CLASS : undefined
}

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

function pastedColumnId(column: BidColumn): string {
  return `${PASTED_COLUMN_ID_PREFIX}${column.index}`
}

function pastedColumnLabel(column: BidColumn): string {
  return column.label === '' ? `Column ${column.index + 1}` : column.label
}

function pastedColumn(column: BidColumn): ColumnDef<BidRow> {
  return {
    id: pastedColumnId(column),
    header: column.label,
    accessorFn: (row) => row.cells[column.index] ?? '',
    meta: {
      headerClassName: column.recognized ? RECOGNIZED_HEADER_CLASS : UNRECOGNIZED_HEADER_CLASS,
    },
  }
}

function priceColumn(field: BidPriceField, editing: BidRowEditing | undefined): ColumnDef<BidRow> {
  const label = PRICING_COLUMN_LABELS[field]
  if (!editing) {
    return {
      accessorKey: field,
      header: label,
      cell: ({ row }) => {
        const inherited = field === 'transport_cost' && !row.original.transport_cost_overridden
        return (
          <span className={inherited ? INHERITED_VALUE_CLASS : ''}>
            {formatUSDWithSymbol(row.original[field])}
          </span>
        )
      },
    }
  }
  return {
    accessorKey: field,
    header: label,
    size: AMOUNT_COLUMN_SIZE,
    meta: { cellClassName: 'py-0' },
    cell: ({ row, table }) => {
      if (row.original.zero_priced) return formatUSDWithSymbol(row.original[field])
      return (
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
      )
    },
  }
}

function zeroPriceColumn(editing: BidRowEditing | undefined): ColumnDef<BidRow> {
  return {
    accessorKey: 'zero_priced',
    header: PRICING_COLUMN_LABELS.zero_priced,
    enableSorting: false,
    meta: { cellClassName: 'py-0' },
    cell: ({ row }) => {
      if (editing) {
        return (
          <NoBidToggle
            row={row.original}
            rowNumber={row.index + 1}
            onToggle={editing.toggleZeroPrice}
          />
        )
      }
      return row.original.zero_priced ? NO_BID_LABEL : ''
    },
  }
}

function pinnedToEnd(column: ColumnDef<BidRow>): ColumnDef<BidRow> {
  return { ...column, meta: { ...column.meta, reorderable: false } }
}

function pricingColumns(editing: BidRowEditing | undefined): ColumnDef<BidRow>[] {
  const columns: ColumnDef<BidRow>[] = [
    priceColumn('selling_price', editing),
    priceColumn('transport_cost', editing),
    {
      accessorKey: 'margin_percent',
      header: PRICING_COLUMN_LABELS.margin_percent,
      cell: ({ row }) => (
        <span className={row.original.margin_overridden ? '' : INHERITED_VALUE_CLASS}>
          {row.original.margin_percent === null ? '' : `${row.original.margin_percent}%`}
        </span>
      ),
    },
    {
      accessorKey: 'bid_price',
      header: PRICING_COLUMN_LABELS.bid_price,
      cell: ({ row }) => formatUSDWithSymbol(row.original.bid_price),
    },
    zeroPriceColumn(editing),
  ]
  return columns.map(pinnedToEnd)
}

export function buildBidGridColumns(
  headers: readonly string[],
  editing: BidRowEditing | undefined,
): ColumnDef<BidRow>[] {
  const pasted = classifyBidColumns(headers)
  const recognized = pasted.filter((column) => column.recognized).map(pastedColumn)
  const unrecognized = pasted.filter((column) => !column.recognized).map(pastedColumn)
  const select = editing ? [createSelectColumn<BidRow>()] : []
  return [...select, ...recognized, ...unrecognized, ...pricingColumns(editing)]
}

export function bidPickerColumns(headers: readonly string[]): PickerColumn[] {
  const sheetColumns = classifyBidColumns(headers).map((column) => ({
    id: pastedColumnId(column),
    label: pastedColumnLabel(column),
    section: SHEET_SECTION_ID,
  }))
  const pricing = Object.entries(PRICING_COLUMN_LABELS).map(([id, label]) => ({
    id,
    label,
    section: PRICING_SECTION_ID,
  }))
  return [...sheetColumns, ...pricing]
}

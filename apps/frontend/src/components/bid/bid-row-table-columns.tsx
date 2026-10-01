import { NO_BID_LABEL, NoBidToggle } from '@/components/bid/no-bid-toggle'
import type { PickerColumn, PickerSection } from '@/components/shared/column-picker'
import { EditableAmountCell, type AmountInputProps } from '@/components/shared/editable-amount-cell'
import { PercentInput } from '@/components/shared/percent-input'
import { PriceInput } from '@/components/shared/price-input'
import { createSelectColumn } from '@/components/table-columns/column-primitives'
import { classifyBidColumns, type BidColumn } from '@/lib/bid-column-recognition'
import { formatUSDWithSymbol } from '@/lib/formatters'
import type { PriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import type { ColumnDef } from '@tanstack/react-table'
import type { BidRow } from 'shared-types'

const BID_PRICE_FIELDS = ['selling_price', 'transport_cost', 'margin_percent'] as const

export type BidPriceField = (typeof BID_PRICE_FIELDS)[number]

const PRICING_COLUMN_LABELS = {
  selling_price: 'Selling Price',
  transport_cost: 'Freight',
  margin_percent: 'Margin %',
  margin_amount: 'Margin',
  bid_price: 'Bid Price',
  zero_priced: NO_BID_LABEL,
} as const

type PricingColumnId = keyof typeof PRICING_COLUMN_LABELS

const PRICING_COLUMN_CAPTIONS: Partial<Record<PricingColumnId, string>> = {
  selling_price: 's',
  bid_price: 's(1−m)−f',
  transport_cost: 'f',
  margin_percent: 'm',
}

const CAPTIONED_HEADER_CLASS = 'h-auto py-1'
const EDITABLE_HEADER_CLASS = 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100'
const EDITABLE_CELL_CLASS =
  'py-0 bg-sky-50 dark:bg-sky-950/40 [.data-row-muted_&]:bg-[var(--row-bg)]'
const BID_PRICE_CELL_CLASS = 'font-semibold'

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

function formatPercent(value: number | null): string {
  return value === null ? '' : `${value}%`
}

type EditableFieldDisplay = {
  format: (value: number | null) => string
  AmountInput: React.ComponentType<AmountInputProps>
  inherited: (row: BidRow) => boolean
}

const EDITABLE_FIELD_DISPLAY = {
  selling_price: {
    format: formatUSDWithSymbol,
    AmountInput: PriceInput,
    inherited: () => false,
  },
  transport_cost: {
    format: formatUSDWithSymbol,
    AmountInput: PriceInput,
    inherited: (row) => !row.transport_cost_overridden,
  },
  margin_percent: {
    format: formatPercent,
    AmountInput: PercentInput,
    inherited: (row) => !row.margin_overridden,
  },
} as const satisfies Record<BidPriceField, EditableFieldDisplay>

function priceColumn(field: BidPriceField, editing: BidRowEditing | undefined): ColumnDef<BidRow> {
  const label = PRICING_COLUMN_LABELS[field]
  const display = EDITABLE_FIELD_DISPLAY[field]
  if (!editing) {
    return {
      accessorKey: field,
      cell: ({ row }) => (
        <span className={display.inherited(row.original) ? INHERITED_VALUE_CLASS : ''}>
          {display.format(row.original[field])}
        </span>
      ),
    }
  }
  return {
    accessorKey: field,
    size: AMOUNT_COLUMN_SIZE,
    meta: { cellClassName: EDITABLE_CELL_CLASS, headerClassName: EDITABLE_HEADER_CLASS },
    cell: ({ row, table }) => {
      if (row.original.zero_priced) return display.format(row.original[field])
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
          format={display.format}
          AmountInput={display.AmountInput}
          onSave={(value) => editing.saveField(row.original.id, field, value)}
        />
      )
    },
  }
}

function zeroPriceColumn(editing: BidRowEditing | undefined): ColumnDef<BidRow> {
  return {
    accessorKey: 'zero_priced',
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

function pricingHeader(id: PricingColumnId): ColumnDef<BidRow>['header'] {
  const label = PRICING_COLUMN_LABELS[id]
  const caption = PRICING_COLUMN_CAPTIONS[id]
  if (caption === undefined) return label
  return () => (
    <span className="flex flex-col leading-tight">
      <span>{label}</span>
      <span className="font-normal">({caption})</span>
    </span>
  )
}

function pricingColumn(id: PricingColumnId, column: ColumnDef<BidRow>): ColumnDef<BidRow> {
  return {
    ...column,
    id,
    header: pricingHeader(id),
    meta: {
      ...column.meta,
      headerClassName: `${CAPTIONED_HEADER_CLASS} ${column.meta?.headerClassName ?? ''}`,
      reorderable: false,
    },
  }
}

function pricingColumns(editing: BidRowEditing | undefined): ColumnDef<BidRow>[] {
  return [
    pricingColumn('selling_price', priceColumn('selling_price', editing)),
    pricingColumn('transport_cost', priceColumn('transport_cost', editing)),
    pricingColumn('margin_percent', priceColumn('margin_percent', editing)),
    pricingColumn('margin_amount', {
      accessorKey: 'margin_amount',
      cell: ({ row }) => formatUSDWithSymbol(row.original.margin_amount),
    }),
    pricingColumn('bid_price', {
      accessorKey: 'bid_price',
      meta: { cellClassName: BID_PRICE_CELL_CLASS },
      cell: ({ row }) => formatUSDWithSymbol(row.original.bid_price),
    }),
    pricingColumn('zero_priced', zeroPriceColumn(editing)),
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

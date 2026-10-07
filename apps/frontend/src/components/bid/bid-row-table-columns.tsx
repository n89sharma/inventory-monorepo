import {
  onHandColumns,
  salesColumns,
  STOCK_SECTION_ID,
  stockPickerColumns,
  type BidRowWithStock,
} from '@/components/bid/bid-stock-columns'
import { NO_BID_LABEL, NoBidToggle } from '@/components/bid/no-bid-toggle'
import type { PickerColumn, PickerSection } from '@/components/shared/column-picker'
import { EditableAmountCell, type AmountInputProps } from '@/components/shared/editable-amount-cell'
import { PercentInput } from '@/components/shared/percent-input'
import { PriceInput } from '@/components/shared/price-input'
import { createSelectColumn } from '@/components/table-columns/column-primitives'
import type { SalesWindowMonths } from '@/lib/filters/parsers'
import { parseBidMeterReading, type LabelledBidColumn } from '@/lib/bid-column-labels'
import { formatThousandsK, formatUSDWithSymbol } from '@/lib/formatters'
import type { PriceCellEditorRegistry } from '@/lib/price-cell-navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { BID_COLUMN_ROLE, type BidRow, type BidRowModel } from 'shared-types'

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
  { id: STOCK_SECTION_ID, label: 'Stock & Sales' },
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
const MATCHED_MODEL_CLASS = 'font-medium text-emerald-700 dark:text-emerald-400'

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

function pastedColumnId(column: LabelledBidColumn): string {
  return `${PASTED_COLUMN_ID_PREFIX}${column.index}`
}

function meterReadingOrLowest(text: unknown): number {
  return parseBidMeterReading(String(text)) ?? Number.NEGATIVE_INFINITY
}

function meterColumn(column: ColumnDef<BidRowWithStock>): ColumnDef<BidRowWithStock> {
  return {
    ...column,
    cell: ({ getValue }) => {
      const text = String(getValue())
      const reading = parseBidMeterReading(text)
      return reading === null ? text : formatThousandsK(reading)
    },
    sortingFn: (rowA, rowB, columnId) =>
      meterReadingOrLowest(rowA.getValue(columnId)) - meterReadingOrLowest(rowB.getValue(columnId)),
  }
}

function BidModelCell({
  model,
  vendorText,
}: {
  model: BidRowModel | null
  vendorText: string
}): React.JSX.Element {
  if (model === null) return <>{vendorText}</>
  return (
    <span className={MATCHED_MODEL_CLASS} title={vendorText}>
      {model.name}
    </span>
  )
}

function modelColumn(column: ColumnDef<BidRowWithStock>): ColumnDef<BidRowWithStock> {
  return {
    ...column,
    cell: ({ row, getValue }) => (
      <BidModelCell model={row.original.model} vendorText={String(getValue())} />
    ),
  }
}

function pastedColumn(column: LabelledBidColumn): ColumnDef<BidRowWithStock> {
  const definition: ColumnDef<BidRowWithStock> = {
    id: pastedColumnId(column),
    header: column.label,
    accessorFn: (row) => row.cells[column.index] ?? '',
    meta: {
      headerClassName: column.role === null ? UNRECOGNIZED_HEADER_CLASS : RECOGNIZED_HEADER_CLASS,
    },
  }
  if (column.role === BID_COLUMN_ROLE.TOTAL_METER) return meterColumn(definition)
  if (column.role === BID_COLUMN_ROLE.MODEL) return modelColumn(definition)
  return definition
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

function priceColumn(
  field: BidPriceField,
  editing: BidRowEditing | undefined,
): ColumnDef<BidRowWithStock> {
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

function zeroPriceColumn(editing: BidRowEditing | undefined): ColumnDef<BidRowWithStock> {
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

function pricingHeader(id: PricingColumnId): ColumnDef<BidRowWithStock>['header'] {
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

function pricingColumn(
  id: PricingColumnId,
  column: ColumnDef<BidRowWithStock>,
): ColumnDef<BidRowWithStock> {
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

function pricingColumns(editing: BidRowEditing | undefined): ColumnDef<BidRowWithStock>[] {
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
  sheetColumns: readonly LabelledBidColumn[],
  editing: BidRowEditing | undefined,
  months: SalesWindowMonths,
): ColumnDef<BidRowWithStock>[] {
  const select = editing ? [createSelectColumn<BidRowWithStock>()] : []
  const mapped = sheetColumns.filter((column) => column.role !== null).map(pastedColumn)
  const unmapped = sheetColumns.filter((column) => column.role === null).map(pastedColumn)
  return [
    ...select,
    ...mapped,
    ...unmapped,
    ...onHandColumns(),
    ...salesColumns(months),
    ...pricingColumns(editing),
  ]
}

export function bidPickerColumns(sheetColumns: readonly LabelledBidColumn[]): PickerColumn[] {
  const pickerSheetColumns = sheetColumns.map((column) => ({
    id: pastedColumnId(column),
    label: column.label,
    section: SHEET_SECTION_ID,
  }))
  const pricing = Object.entries(PRICING_COLUMN_LABELS).map(([id, label]) => ({
    id,
    label,
    section: PRICING_SECTION_ID,
  }))
  return [...pickerSheetColumns, ...stockPickerColumns(), ...pricing]
}

import { ArrivalLinks } from '@/components/shared/arrival-links'
import { Checkbox } from '@/components/shadcn/checkbox'
import {
  assetCountColumn,
  createdByColumn,
} from '@/components/table-columns/collection-summary-columns'
import { ID_COLUMN_SIZE, IdLink } from '@/components/table-columns/column-primitives'
import type { SummaryColumn } from '@/components/table-columns/summary-column'
import { formatDate, formatUSDWithSymbol } from '@/lib/formatters'
import type { SortingFn } from '@tanstack/react-table'
import { parseISO } from 'date-fns'
import { INVOICE_TYPE, type InvoiceSummary } from 'shared-types'
import type { InvoiceTypeFilter } from '@/ui-types/invoice-form-types'

type InvoiceCellContext = {
  getHref: (invoice: InvoiceSummary) => string
}

type InvoiceSummaryColumn = SummaryColumn<InvoiceSummary, InvoiceCellContext>

const CLEARED_TEXT = { true: 'Yes', false: 'No' } as const
const LIST_SEPARATOR = ', '
const DATE_SPAN_SEPARATOR = ' – '
const DATE_SPAN_COLUMN_SIZE = 280
const NO_DATE_SORT_VALUE = ''

const INVOICE_DATE_COLUMN: InvoiceSummaryColumn = {
  id: 'invoice_date',
  label: 'Invoice Date',
  text: (invoice) => formatDate(parseISO(invoice.invoice_date)),
  sortable: true,
  size: 140,
}

function formatDateSpan(startDate: string | null, endDate: string | null): string {
  if (startDate === null) return ''
  const start = formatDate(parseISO(startDate))
  if (endDate === null || endDate === startDate) return start
  return `${start}${DATE_SPAN_SEPARATOR}${formatDate(parseISO(endDate))}`
}

const dateSpanSort: SortingFn<InvoiceSummary> = (rowA, rowB, columnId) => {
  const a = rowA.getValue<string | null>(columnId) ?? NO_DATE_SORT_VALUE
  const b = rowB.getValue<string | null>(columnId) ?? NO_DATE_SORT_VALUE
  return a.localeCompare(b)
}

const ARRIVAL_DATES_COLUMN: InvoiceSummaryColumn = {
  id: 'arrival_start_date',
  label: 'Arrival Dates',
  text: (invoice) => formatDateSpan(invoice.arrival_start_date, invoice.arrival_end_date),
  sortable: true,
  sortingFn: dateSpanSort,
  size: DATE_SPAN_COLUMN_SIZE,
}

const DEPARTURE_DATES_COLUMN: InvoiceSummaryColumn = {
  id: 'departure_start_date',
  label: 'Departure Dates',
  text: (invoice) => formatDateSpan(invoice.departure_start_date, invoice.departure_end_date),
  sortable: true,
  sortingFn: dateSpanSort,
  size: DATE_SPAN_COLUMN_SIZE,
}

const REFERENCE_COLUMN: InvoiceSummaryColumn = {
  id: 'invoice_reference',
  label: 'Reference Invoice Number',
  text: (invoice) => invoice.invoice_reference,
  cell: (invoice, { getHref }) => (
    <IdLink to={getHref(invoice)}>{invoice.invoice_reference}</IdLink>
  ),
  filterFn: 'includesString',
  size: ID_COLUMN_SIZE,
}

function organizationColumn(label: string): InvoiceSummaryColumn {
  return {
    id: 'organization',
    label,
    text: (invoice) => invoice.organization ?? '',
    sortable: true,
    filterFn: 'includesString',
  }
}

const WAREHOUSE_COLUMN: InvoiceSummaryColumn = {
  id: 'destination_codes',
  label: 'Warehouse',
  text: (invoice) => invoice.destination_codes.join(LIST_SEPARATOR),
}

const ARRIVAL_NUMBERS_COLUMN: InvoiceSummaryColumn = {
  id: 'arrival_numbers',
  label: 'Arrival IDs',
  text: (invoice) => invoice.arrival_numbers.join(LIST_SEPARATOR),
  cell: (invoice) => <ArrivalLinks arrivalNumbers={invoice.arrival_numbers} />,
}

const TRANSPORTERS_COLUMN: InvoiceSummaryColumn = {
  id: 'transporters',
  label: 'Transporters',
  text: (invoice) => invoice.transporters.join(LIST_SEPARATOR),
}

const CLEARED_COLUMN: InvoiceSummaryColumn = {
  id: 'is_cleared',
  label: 'Cleared',
  text: (invoice) => CLEARED_TEXT[invoice.is_cleared ? 'true' : 'false'],
  cell: (invoice) => (
    <div className="flex justify-center">
      <Checkbox checked={invoice.is_cleared} />
    </div>
  ),
}

function currencyColumn(
  id: keyof InvoiceSummary,
  label: string,
  permission: InvoiceSummaryColumn['permission'],
): InvoiceSummaryColumn {
  return {
    id,
    label,
    permission,
    text: (invoice) => {
      const amount = invoice[id]
      return typeof amount === 'number' ? formatUSDWithSymbol(amount) : ''
    },
  }
}

const PURCHASE_COST_COLUMN = currencyColumn('purchase_cost', 'Purchase Cost', 'view_purchase_price')
const TRANSPORT_COST_COLUMN = currencyColumn(
  'transport_cost',
  'Transport Cost',
  'view_purchase_price',
)
const TRANSFER_COST_COLUMN = currencyColumn('transfer_cost', 'Transfer Cost', 'view_purchase_price')
const TOTAL_COST_COLUMN = currencyColumn('total_cost', 'Total Cost', 'view_purchase_price')
const SALE_PRICE_COLUMN = currencyColumn('sale_price', 'Sale Price', 'view_sale_price')

const NOTES_COLUMN: InvoiceSummaryColumn = {
  id: 'notes',
  label: 'Notes',
  text: (invoice) => invoice.notes ?? '',
}

const PURCHASE_INVOICE_COLUMNS: readonly InvoiceSummaryColumn[] = [
  ARRIVAL_DATES_COLUMN,
  INVOICE_DATE_COLUMN,
  REFERENCE_COLUMN,
  organizationColumn('Vendor'),
  WAREHOUSE_COLUMN,
  ARRIVAL_NUMBERS_COLUMN,
  TRANSPORTERS_COLUMN,
  CLEARED_COLUMN,
  PURCHASE_COST_COLUMN,
  TRANSPORT_COST_COLUMN,
  TRANSFER_COST_COLUMN,
  TOTAL_COST_COLUMN,
  SALE_PRICE_COLUMN,
  NOTES_COLUMN,
  assetCountColumn(),
  createdByColumn(),
]

const SALES_INVOICE_COLUMNS: readonly InvoiceSummaryColumn[] = [
  DEPARTURE_DATES_COLUMN,
  INVOICE_DATE_COLUMN,
  REFERENCE_COLUMN,
  organizationColumn('Customer'),
  PURCHASE_COST_COLUMN,
  TRANSPORT_COST_COLUMN,
  TRANSFER_COST_COLUMN,
  TOTAL_COST_COLUMN,
  SALE_PRICE_COLUMN,
  NOTES_COLUMN,
  assetCountColumn(),
  createdByColumn(),
]

export const INVOICE_COLUMNS_BY_TYPE = {
  [INVOICE_TYPE.purchase]: PURCHASE_INVOICE_COLUMNS,
  [INVOICE_TYPE.sales]: SALES_INVOICE_COLUMNS,
} as const satisfies Record<InvoiceTypeFilter, readonly InvoiceSummaryColumn[]>

const PURCHASE_PINNED_COLUMN_IDS = [
  ARRIVAL_DATES_COLUMN.id,
  INVOICE_DATE_COLUMN.id,
  REFERENCE_COLUMN.id,
]
const SALES_PINNED_COLUMN_IDS = [
  DEPARTURE_DATES_COLUMN.id,
  INVOICE_DATE_COLUMN.id,
  REFERENCE_COLUMN.id,
]

export const INVOICE_PINNED_COLUMN_IDS_BY_TYPE = {
  [INVOICE_TYPE.purchase]: PURCHASE_PINNED_COLUMN_IDS,
  [INVOICE_TYPE.sales]: SALES_PINNED_COLUMN_IDS,
} as const satisfies Record<InvoiceTypeFilter, readonly string[]>

export const INVOICE_DEFAULT_SORT_BY_TYPE = {
  [INVOICE_TYPE.purchase]: { id: ARRIVAL_DATES_COLUMN.id, desc: true },
  [INVOICE_TYPE.sales]: { id: DEPARTURE_DATES_COLUMN.id, desc: true },
} as const satisfies Record<InvoiceTypeFilter, { id: string; desc: boolean }>

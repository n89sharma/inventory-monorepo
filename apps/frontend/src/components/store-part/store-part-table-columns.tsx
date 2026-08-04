import { ID_COLUMN_SIZE, IdLink } from '@/components/table-columns/column-primitives'
import type { SummaryColumn } from '@/components/table-columns/summary-column'
import { formatDate, formatUSDWithSymbol } from '@/lib/formatters'
import type { StorePartSummary } from 'shared-types'

type StorePartCellContext = {
  getHref: (row: StorePartSummary) => string
}

type StorePartColumn = SummaryColumn<StorePartSummary, StorePartCellContext>

// Where a column defines both, the cell must render exactly what text returns —
// wrapped only for alignment — so the CSV matches the table.
export const STORE_PART_COLUMNS: readonly StorePartColumn[] = [
  {
    id: 'part_number',
    label: 'Part #',
    text: (row) => row.part_number,
    cell: (row, { getHref }) => <IdLink to={getHref(row)}>{row.part_number}</IdLink>,
    size: ID_COLUMN_SIZE,
  },
  {
    id: 'description',
    label: 'Description',
    text: (row) => row.description,
  },
  {
    id: 'warehouse_code',
    label: 'Warehouse',
    text: (row) => row.warehouse_code,
  },
  {
    id: 'on_hand',
    label: 'On hand',
    text: (row) => String(row.on_hand),
    cell: (row) => <div className="text-center tabular-nums">{row.on_hand}</div>,
    sortable: true,
  },
  {
    id: 'last_updated',
    label: 'Last updated',
    text: (row) => (row.last_updated ? formatDate(row.last_updated) : '-'),
    sortable: true,
  },
  {
    id: 'stock_value',
    label: 'Value',
    text: (row) => formatUSDWithSymbol(row.stock_value),
    cell: (row) => (
      <div className="text-right tabular-nums">{formatUSDWithSymbol(row.stock_value)}</div>
    ),
    sortable: true,
    permission: 'view_purchase_price',
  },
]

import { ID_COLUMN_SIZE, IdLink } from '@/components/table-columns/column-primitives'
import type { SummaryColumn } from '@/components/table-columns/summary-column'
import { formatDate, formatUSDWithSymbol } from '@/lib/formatters'
import { effectiveUnitCost } from '@/lib/store-part-value'
import type { StorePartSummary } from 'shared-types'

type StorePartCellContext = {
  getHref: (row: StorePartSummary) => string
}

type StorePartColumn = SummaryColumn<StorePartSummary, StorePartCellContext>

const CENTERED = 'text-center'
const CENTERED_NUMERIC = 'text-center tabular-nums'

// Where a column defines both, the cell must render exactly what text returns —
// wrapped only for alignment — so the CSV matches the table.
export const STORE_PART_COLUMNS: readonly StorePartColumn[] = [
  {
    id: 'part_number',
    label: 'Part #',
    text: (row) => row.part_number,
    cell: (row, { getHref }) => (
      <div className={CENTERED}>
        <IdLink to={getHref(row)}>{row.part_number}</IdLink>
      </div>
    ),
    size: ID_COLUMN_SIZE,
  },
  {
    id: 'description',
    label: 'Description',
    text: (row) => row.description,
    cell: (row) => <div className={CENTERED}>{row.description}</div>,
  },
  {
    id: 'on_hand',
    label: 'On hand',
    text: (row) => String(row.on_hand),
    cell: (row) => <div className={CENTERED_NUMERIC}>{row.on_hand}</div>,
    sortable: true,
  },
  {
    id: 'effective_unit_cost',
    label: 'Effective unit cost',
    text: (row) => formatUSDWithSymbol(effectiveUnitCost(row.stock_value, row.on_hand)),
    cell: (row) => (
      <div className={CENTERED_NUMERIC}>
        {formatUSDWithSymbol(effectiveUnitCost(row.stock_value, row.on_hand))}
      </div>
    ),
    permission: 'view_purchase_price',
  },
  {
    id: 'stock_value',
    label: 'Total value',
    text: (row) => formatUSDWithSymbol(row.stock_value),
    cell: (row) => <div className={CENTERED_NUMERIC}>{formatUSDWithSymbol(row.stock_value)}</div>,
    sortable: true,
    permission: 'view_purchase_price',
  },
  {
    id: 'last_updated',
    label: 'Last updated',
    text: (row) => (row.last_updated ? formatDate(row.last_updated) : '-'),
    cell: (row) => (
      <div className={CENTERED}>{row.last_updated ? formatDate(row.last_updated) : '-'}</div>
    ),
    sortable: true,
  },
]

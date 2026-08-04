import { createIdColumn, sortableHeader } from '@/components/table-columns/column-primitives'
import { formatDate, formatUSDWithSymbol } from '@/lib/formatters'
import type { ColumnDef } from '@tanstack/react-table'
import type { StorePartSummary } from 'shared-types'

const STOCK_VALUE_COLUMN: ColumnDef<StorePartSummary> = {
  accessorKey: 'stock_value',
  header: sortableHeader<StorePartSummary>('Value'),
  cell: ({ row }) => (
    <div className="text-right tabular-nums">{formatUSDWithSymbol(row.original.stock_value)}</div>
  ),
}

export function buildStorePartTableColumns(
  canViewStockValue: boolean,
): ColumnDef<StorePartSummary>[] {
  const columns: ColumnDef<StorePartSummary>[] = [
    createIdColumn<StorePartSummary>({
      accessorKey: 'part_number',
      header: 'Part #',
      href: (row) => `/store/${row.id}?warehouse=${row.warehouse_id}`,
      value: (row) => row.part_number,
    }),
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'warehouse_code', header: 'Warehouse' },
    {
      accessorKey: 'on_hand',
      header: sortableHeader<StorePartSummary>('On hand'),
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.on_hand}</div>,
    },
    {
      accessorKey: 'last_updated',
      header: sortableHeader<StorePartSummary>('Last updated'),
      cell: ({ getValue }) => {
        const date = getValue<Date>()
        return date ? formatDate(date) : '-'
      },
    },
  ]

  if (canViewStockValue) columns.push(STOCK_VALUE_COLUMN)
  return columns
}
